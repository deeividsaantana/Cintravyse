-- Bloco montado como texto (202611230001) comparado com erp_montar_bloco.
\set ON_ERROR_STOP on

select 'teste-texto-' || gen_random_uuid() as org \gset
insert into public.organizations (id, name) values (:'org', 'TESTE-CLAUDE texto');
select set_config('teste.org', :'org', false) \gset
insert into public.erp_registros (organization_id, colecao, id, registro, ordem)
select :'org', colecao, colecao || '-' || g,
  jsonb_build_object('id', colecao || '-' || g, 'n', g, 'texto', 'aspas " e \ barra, vírgula }'), 10 - g
from unnest(array['abastecimentos', 'historyLogs', 'presencasLink']) colecao, generate_series(1, 5) g;

do $$
declare
  v_org text := current_setting('teste.org');
  v_bloco jsonb;
begin
  foreach v_bloco in array array[
    null,
    '{}'::jsonb,
    '[]'::jsonb,
    '{"funcionarios": [{"id": "f1", "nome": "Zé \"Grande\""}]}'::jsonb,
    '{"abastecimentos": [{"id": "x"}], "historyLogs": []}'::jsonb,
    '{"abastecimentos": [], "historyLogs": [], "presencasLink": [], "controleEquipamentosDiario": []}'::jsonb
  ] loop
    if public.erp_montar_bloco_json(v_org, v_bloco)::jsonb is distinct from public.erp_montar_bloco(v_org, v_bloco) then
      raise exception 'bloco diferente para %', v_bloco;
    end if;
  end loop;
  -- Organização sem lançamentos separados devolve o bloco como está.
  if public.erp_montar_bloco_json('sem-registros', '{"a": 1}')::jsonb is distinct from '{"a": 1}'::jsonb then
    raise exception 'bloco sem registros mudou';
  end if;
end $$;

select 'bloco em texto igual ao jsonb' as resultado;
