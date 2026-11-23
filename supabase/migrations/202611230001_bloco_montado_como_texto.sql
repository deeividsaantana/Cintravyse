-- Entrar no site sem esperar 10 s pela obra (23/11/2026).
--
-- Medido em produção em 23/11: ler_erp_snapshot levou em média 9,2 s
-- (7 chamadas, de 7,7 s a 11,2 s) para devolver a obra (bloco de 4 MB +
-- 15 mil lançamentos de erp_registros, uns 16 MB). O tempo ia quase todo em
-- juntar tudo num jsonb só (jsonb_object_agg e "bloco || coleções"); ler as
-- linhas leva 0,3 s.
--
-- Agora o bloco e as listas são colados como texto e devolvidos como json
-- (o json guarda o texto como está, sem remontar). Mesmo conteúdo: em
-- produção, o texto novo convertido em jsonb deu igual a erp_montar_bloco.
-- Tempo medido com os dados de produção: 0,9 s. O app não muda: recebe o
-- mesmo objeto.
--
-- Voltar atrás: rodar de novo ler_erp_snapshot de
-- 202611150003_lancamentos_em_tabela_propria.sql (com drop antes, porque o
-- tipo da coluna payload volta a ser jsonb).

begin;

create or replace function public.erp_montar_bloco_json(p_organization_id text, p_payload jsonb)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_fora text[];
  v_listas text;
begin
  if p_payload is null then
    return null;
  end if;
  -- Bloco que não é objeto: caminho antigo, que já sabe lidar.
  if jsonb_typeof(p_payload) <> 'object' then
    return public.erp_montar_bloco(p_organization_id, p_payload)::json;
  end if;
  v_fora := public.erp_colecoes_fora_do_payload(p_payload);
  if cardinality(v_fora) > 0 then
    select string_agg(to_json(registro.colecao)::text || ': [' || registro.lista || ']', ', ' order by registro.colecao)
    into v_listas
    from (
      select registro.colecao, string_agg(registro.registro::text, ', ' order by registro.ordem, registro.id) as lista
      from public.erp_registros registro
      where registro.organization_id = p_organization_id
        and registro.colecao = any(v_fora)
      group by registro.colecao
    ) registro;
  end if;
  if v_listas is null then
    return p_payload::json;
  end if;
  if p_payload = '{}'::jsonb then
    return ('{' || v_listas || '}')::json;
  end if;
  -- Tira o "}" do fim do bloco e acrescenta as listas.
  return (left(p_payload::text, -1) || ', ' || v_listas || '}')::json;
end;
$$;

revoke all on function public.erp_montar_bloco_json(text, jsonb) from public, anon, authenticated;

-- O tipo da coluna payload muda (jsonb → json): precisa apagar e criar.
drop function if exists public.ler_erp_snapshot(text);

create function public.ler_erp_snapshot(p_organization_id text)
returns table (payload json, updated_at timestamptz, record_count integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if not exists (
    select 1 from public.organization_members member
    where member.organization_id = p_organization_id and member.user_id = auth.uid()
  ) then
    return;
  end if;
  return query
    select public.erp_montar_bloco_json(snapshot.organization_id, snapshot.payload), snapshot.updated_at, snapshot.record_count
    from public.erp_snapshots snapshot
    where snapshot.organization_id = p_organization_id;
end;
$$;

revoke all on function public.ler_erp_snapshot(text) from public, anon;
grant execute on function public.ler_erp_snapshot(text) to authenticated;

commit;

-- A API do Supabase passa a enxergar a função nova na hora.
notify pgrst, 'reload schema';
