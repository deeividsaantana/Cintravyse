-- Apaga o arquivo antigo de Materiais e Jazida (22/11/2026).
--
-- Pedido do Deivid: apagar a tabela erp_colecoes_removidas (~20 MB), que
-- guardava o que saiu do bloco quando as abas Materiais e Jazida foram
-- removidas (migração 202611100001). Nada no site nem na API lê essa tabela.
--
-- O gatilho erp_snapshots_tira_colecoes_removidas continua: um aparelho com
-- versão velha do site ainda pode mandar essas coleções, e elas não podem
-- voltar ao bloco. A diferença é que agora ele só tira, sem guardar cópia.
-- Por isso o gatilho é trocado antes de apagar a tabela; sem isso, todo
-- salvamento que trouxesse essas coleções daria erro.
--
-- Não tem volta: a tabela e o que está nela somem.

begin;

create or replace function public.erp_tirar_colecoes_removidas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fora text[] := public.erp_colecoes_fora_do_bloco();
  v_colecao text;
  v_marcas jsonb;
  v_marcas_antes jsonb;
begin
  if new.payload is null or jsonb_typeof(new.payload) <> 'object' then
    return new;
  end if;

  v_marcas := case when jsonb_typeof(new.payload -> 'exclusoes') = 'array' then new.payload -> 'exclusoes' end;
  v_marcas_antes := case when tg_op = 'UPDATE' and jsonb_typeof(old.payload -> 'exclusoes') = 'array'
    then old.payload -> 'exclusoes' end;

  -- Salvamento comum (nada das coleções removidas e marcas iguais) sai na hora.
  if not (new.payload ?| v_fora)
     and (v_marcas is null or v_marcas is not distinct from v_marcas_antes)
     and coalesce(current_setting('erp.limpar_colecoes_removidas', true), '') <> 'on' then
    return new;
  end if;

  -- 1. Tira do bloco as coleções removidas.
  foreach v_colecao in array v_fora loop
    new.payload := new.payload - v_colecao;
  end loop;

  -- 2. Tira do bloco as marcas de exclusão dessas coleções.
  if v_marcas is not null and exists (
    select 1 from jsonb_array_elements(v_marcas) marca where marca ->> 'tabela' = any(v_fora)
  ) then
    new.payload := jsonb_set(new.payload, '{exclusoes}', coalesce((
      select jsonb_agg(marca order by ordem)
      from jsonb_array_elements(v_marcas) with ordinality as linha(marca, ordem)
      where not coalesce(marca ->> 'tabela' = any(v_fora), false)
    ), '[]'::jsonb));
  end if;

  -- A contagem segue o que ficou no bloco: sem isso o próximo salvamento
  -- pareceria encolher e copiaria o bloco inteiro no histórico.
  select coalesce(sum(jsonb_array_length(entry.value)), 0)::integer
      + public.erp_contar_separados(new.organization_id, new.payload)
    into new.record_count
    from jsonb_each(new.payload) entry
    where jsonb_typeof(entry.value) = 'array';

  return new;
end;
$$;

revoke all on function public.erp_tirar_colecoes_removidas() from public, anon, authenticated;

drop table if exists public.erp_colecoes_removidas;

commit;
