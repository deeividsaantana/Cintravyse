-- Colaborador repetido não entra (pedido de 23/11/2026).
-- A tela já recusa matrícula e nome repetidos. Esta trava no banco recusa a
-- gravação que AUMENTA o número de matrículas repetidas na lista de
-- colaboradores (zeros à esquerda não contam). Quem já estava repetido
-- continua podendo ser editado; só não entra repetido novo.
begin;

create or replace function public.erp_matriculas_repetidas(p_payload jsonb)
returns integer
language sql
immutable
as $$
  select coalesce(sum(total - 1), 0)::integer
  from (
    select count(*) as total
    from jsonb_array_elements(coalesce(p_payload -> 'funcionarios', '[]'::jsonb)) item
    where coalesce(trim(item ->> 'matricula'), '') <> ''
    group by coalesce(nullif(ltrim(regexp_replace(upper(item ->> 'matricula'), '[^A-Z0-9]', '', 'g'), '0'), ''), '0')
    having count(*) > 1
  ) repetidas;
$$;

create or replace function public.erp_recusar_colaborador_repetido()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.payload ? 'funcionarios'
    and public.erp_matriculas_repetidas(new.payload)
      > case when tg_op = 'UPDATE' then public.erp_matriculas_repetidas(old.payload) else 0 end then
    raise exception 'COLABORADOR_REPETIDO: já existe um colaborador com esta matrícula.';
  end if;
  return new;
end;
$$;

drop trigger if exists erp_snapshots_colaborador_repetido on public.erp_snapshots;
create trigger erp_snapshots_colaborador_repetido
before insert or update of payload on public.erp_snapshots
for each row execute function public.erp_recusar_colaborador_repetido();

commit;

-- Para desfazer:
--   drop trigger erp_snapshots_colaborador_repetido on public.erp_snapshots;
