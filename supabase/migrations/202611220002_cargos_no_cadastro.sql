-- Cargos entram nos cadastros protegidos (22/11/2026).
--
-- A aba Cadastros ganhou a coleção "cargos" (Pessoas > Cargos, com o nível de
-- cada cargo na pirâmide). Como os outros cadastros, o perfil operador pode
-- atualizar, mas não pode tirar um cargo da lista nem marcar exclusão dele.
-- Esta migração só repete a função erp_recusar_por_perfil da 202611180001 com
-- 'cargos' a mais em v_tabelas_cadastro. Nada é apagado nem alterado nos dados.

begin;

create or replace function public.erp_recusar_por_perfil(
  p_organization_id text,
  p_antes jsonb,
  p_depois jsonb
)
returns void
language plpgsql
stable
set search_path = public
as $$
declare
  v_tabelas_gestao text[] := array['planejamentoItens', 'naoConformidades', 'medicoes', 'documentos', 'lancamentosCusto', 'orcamentoItens', 'frentesServico'];
  v_tabelas_cadastro text[] := array['empresas', 'obras', 'equipamentos', 'funcionarios', 'motoristasOperacionais', 'comboios', 'canteiros', 'combustiveis', 'lubrificantes', 'etapas', 'materiaisCadastro', 'cargos'];
  v_marcas_antes jsonb;
  v_marcas_depois jsonb;
  v_ativas jsonb;
  v_tabela text;
  v_a jsonb;
  v_d jsonb;
  v_gestao text[] := '{}';
  v_cadastro text[] := '{}';
  v_marcas text;
begin
  -- 18/11/2026: apagar solicitação de compra ou lançamento de produção
  -- (tirar da lista ou marcar exclusão) só o dono do sistema, qualquer perfil.
  perform public.erp_recusar_apagar_so_dev(p_organization_id, p_antes, p_depois);

  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'operador' then
    return;
  end if;
  if not exists (
    select 1 from public.organization_members member
    where member.organization_id = p_organization_id
      and member.user_id = auth.uid()
      and member.role = 'editor'
  ) then
    return;
  end if;
  if p_antes is null or jsonb_typeof(p_antes) <> 'object' or p_depois is null or jsonb_typeof(p_depois) <> 'object' then
    return;
  end if;

  v_marcas_antes := case when jsonb_typeof(p_antes -> 'exclusoes') = 'array' then p_antes -> 'exclusoes' else '[]'::jsonb end;
  v_marcas_depois := case when jsonb_typeof(p_depois -> 'exclusoes') = 'array' then p_depois -> 'exclusoes' else '[]'::jsonb end;

  -- Laço por tabela, e não uma consulta só: o retrato tem vários MB e milhares
  -- de marcas. Em produção, a versão em consulta única levava 13 s ou mais,
  -- segurando a fila de envios da organização. Tabela igual sai na hora.
  foreach v_tabela in array v_tabelas_gestao || v_tabelas_cadastro loop
    v_a := case when jsonb_typeof(p_antes -> v_tabela) = 'array' then p_antes -> v_tabela else '[]'::jsonb end;
    v_d := case when jsonb_typeof(p_depois -> v_tabela) = 'array' then p_depois -> v_tabela else '[]'::jsonb end;
    continue when v_a = v_d;

    -- Marca ativa antes: a mais recente do registro, como no app (exclusoesAtivas).
    if v_ativas is null then
      select coalesce(jsonb_object_agg(tabela || chr(31) || id, true), '{}'::jsonb) into v_ativas
      from (
        select distinct on (marca ->> 'tabela', marca ->> 'registroId')
          marca ->> 'tabela' as tabela, marca ->> 'registroId' as id, marca -> 'restauradoEm' as restaurado
        from jsonb_array_elements(v_marcas_antes) marca
        where marca ->> 'tabela' is not null and marca ->> 'registroId' is not null
        order by marca ->> 'tabela', marca ->> 'registroId', marca ->> 'excluidoEm' collate "C" desc nulls last
      ) ultima
      where not coalesce(jsonb_typeof(restaurado) = 'string' and restaurado #>> '{}' <> '', false);
    end if;

    if v_tabela = any(v_tabelas_gestao) then
      -- Gestão: compara como multiconjunto (registro e quantas vezes aparece).
      -- Registro com marca ativa antes pode só sair; incluir ou alterar é recusado.
      if exists (
        select 1 from (
          select item, count(*) filter (where no_antes) as antes, count(*) filter (where not no_antes) as depois
          from (
            select item, true as no_antes from jsonb_array_elements(v_a) item
            union all
            select item, false from jsonb_array_elements(v_d) item
          ) itens
          group by item
        ) contagem
        where antes <> depois
          and not (depois < antes and v_ativas ? (v_tabela || chr(31) || coalesce(item ->> 'id', '')))
      ) then
        v_gestao := v_gestao || v_tabela;
      end if;
    elsif exists (
      -- Cadastro: registro que estava na lista e saiu.
      select 1 from (
        select item ->> 'id' as id from jsonb_array_elements(v_a) item where coalesce(item ->> 'id', '') <> ''
        except
        select item ->> 'id' from jsonb_array_elements(v_d) item
      ) saiu
      where not v_ativas ? (v_tabela || chr(31) || id)
    ) then
      v_cadastro := v_cadastro || v_tabela;
    end if;
  end loop;

  -- Marca de exclusão dessas tabelas: o app do operador manda só as que vieram
  -- da nuvem (src/cloud/tabelasPorPerfil.ts). Qualquer marca que não esteja
  -- idêntica no retrato anterior (nova, reativada ou mexida) é recusada. O
  -- except compara o jsonb inteiro: contenção (@>) aceitaria marca sem um campo.
  if v_marcas_antes <> v_marcas_depois then
    select string_agg(distinct novas.marca ->> 'tabela', ', ' order by novas.marca ->> 'tabela') into v_marcas
    from (
      select marca from jsonb_array_elements(v_marcas_depois) as depois(marca)
      except
      select marca from jsonb_array_elements(v_marcas_antes) as antes(marca)
    ) novas
    where novas.marca ->> 'tabela' = any(v_tabelas_gestao || v_tabelas_cadastro);
  end if;

  if cardinality(v_gestao) > 0 or cardinality(v_cadastro) > 0 or v_marcas is not null then
    raise exception 'ROLE_WRITE_DENIED'
      using detail = concat_ws('; ',
        case when cardinality(v_gestao) > 0 then 'gestão alterada: ' || array_to_string(v_gestao, ', ') end,
        case when cardinality(v_cadastro) > 0 then 'cadastro excluído: ' || array_to_string(v_cadastro, ', ') end,
        case when v_marcas is not null then 'exclusão marcada: ' || v_marcas end);
  end if;
end;
$$;

revoke all on function public.erp_recusar_por_perfil(text, jsonb, jsonb) from public, anon;

commit;
