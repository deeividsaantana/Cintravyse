-- Blindagem Onda 0 (Auditoria 28/11/2026):
-- 1. Fecha o bypass na trava de encolhimento (202610200001): antes, um payload
--    onde uma tabela deixava de ser array JSON (ex.: {}, "wipe" ou numero) era
--    ignorado pela comparacao e sobrescrevia os dados na nuvem.
-- 2. Passa a proteger historyLogs e presencasLink contra zeramento ou encolhimento
--    em massa sem marca de exclusao, mantendo apenas filas efemeras
--    (notifications e masterDataReviewQueue) fora da trava.

create or replace function public.erp_tabelas_encolhidas(
  p_antes jsonb,
  p_depois jsonb,
  p_tabelas text[] default null
)
returns table (tabela text, antes integer, depois integer, sumidos integer)
language sql
stable
set search_path = public
as $$
  with marcas as (
    select distinct on (marca->>'tabela', marca->>'registroId')
      marca->>'tabela' as tabela, marca->>'registroId' as registro_id, marca->>'restauradoEm' as restaurado
    from jsonb_array_elements(
      (case when jsonb_typeof(p_depois->'exclusoes') = 'array' then p_depois->'exclusoes' else '[]'::jsonb end)
      || (case when jsonb_typeof(p_antes->'exclusoes') = 'array' then p_antes->'exclusoes' else '[]'::jsonb end)
    ) marca
    order by marca->>'tabela', marca->>'registroId', marca->>'excluidoEm' desc
  ),
  ativas as (
    select tabela, registro_id from marcas where restaurado is null
  ),
  dados_arquivados as (
    select dado.key, dado.value
    from jsonb_array_elements(case when jsonb_typeof(p_depois->'periodosArquivados') = 'array' then p_depois->'periodosArquivados' else '[]'::jsonb end) periodo,
      jsonb_each(case when jsonb_typeof(periodo->'dados') = 'object' then periodo->'dados' else '{}'::jsonb end) dado
  ),
  arquivados as (
    select arquivo.tabela, item->>'id' as id
    from (
      select key as tabela, value as itens from dados_arquivados where key <> 'estacas'
      union all
      select 'estacaLotes', value->'lotes' from dados_arquivados where key = 'estacas'
      union all
      select 'estacaCravacoes', value->'cravacoes' from dados_arquivados where key = 'estacas'
    ) arquivo,
      jsonb_array_elements(case when jsonb_typeof(arquivo.itens) = 'array' then arquivo.itens else '[]'::jsonb end) item
  ),
  tabelas as (
    select entry.key as tabela, entry.value as itens_antes,
      case when jsonb_typeof(p_depois->entry.key) = 'array' then p_depois->entry.key else '[]'::jsonb end as itens_depois
    from jsonb_each(p_antes) entry
    where jsonb_typeof(entry.value) = 'array'
      and jsonb_array_length(entry.value) > 0
      and entry.key not in ('notifications', 'masterDataReviewQueue')
      and (p_tabelas is null or entry.key = any(p_tabelas))
  ),
  ids_antes as (
    select t.tabela, velho->>'id' as id
    from tabelas t, jsonb_array_elements(t.itens_antes) velho
    where coalesce(velho->>'id', '') <> ''
  ),
  ids_depois as (
    select distinct t.tabela, novo->>'id' as id
    from tabelas t, jsonb_array_elements(t.itens_depois) novo
    where coalesce(novo->>'id', '') <> ''
  ),
  sumidos as (
    select velho.tabela, count(*)::integer as total
    from ids_antes velho
    left join ids_depois novo on novo.tabela = velho.tabela and novo.id = velho.id
    left join ativas on velho.tabela <> 'exclusoes' and ativas.tabela = velho.tabela and ativas.registro_id = velho.id
    left join (select distinct tabela, id from arquivados) arquivo
      on velho.tabela <> 'exclusoes' and arquivo.tabela = velho.tabela and arquivo.id = velho.id
    where novo.id is null and ativas.registro_id is null and arquivo.id is null
    group by velho.tabela
  ),
  contagem as (
    select t.tabela,
      jsonb_array_length(t.itens_antes) as antes,
      jsonb_array_length(t.itens_depois) as depois,
      coalesce(s.total, 0) as sumidos
    from tabelas t
    left join sumidos s on s.tabela = t.tabela
  )
  select tabela, antes, depois, sumidos
  from contagem
  where sumidos > 0
    and (
      tabela = 'exclusoes'
      or depois = 0
      or (least(sumidos, antes - depois) >= 20 and least(sumidos, antes - depois) >= antes * 0.2)
    );
$$;

revoke all on function public.erp_tabelas_encolhidas(jsonb, jsonb, text[]) from public, anon;
