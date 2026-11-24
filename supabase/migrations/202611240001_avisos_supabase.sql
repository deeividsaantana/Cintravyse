-- Avisos do Supabase (Security e Performance Advisor), conferidos em 24/11/2026.
-- Nada aqui muda dado; tudo pode ser desfeito com o comando ao lado.

-- 1) reserve_public_ticket_numbers: ninguém usa (nem o site, nem a API, nem
--    outra função do banco) e qualquer pessoa sem login podia chamar por
--    /rest/v1/rpc e gastar números de protocolo. Só o servidor fica com ela.
--    Desfazer: grant execute on function ... to anon, authenticated;
revoke execute on function public.reserve_public_ticket_numbers(text, integer, integer) from public, anon, authenticated;

-- 2) erp_matriculas_repetidas (trava de colaborador repetido): caminho de
--    busca fixo, para ninguém trocar a tabela por trás dela.
alter function public.erp_matriculas_repetidas(jsonb) set search_path = public;

-- 3) Regras de leitura que recalculavam auth.uid() linha por linha.
--    Com (select auth.uid()) o banco calcula uma vez por consulta.
alter policy "members can read their membership" on public.organization_members
  using (user_id = (select auth.uid()));

alter policy "members can read their organization" on public.organizations
  using (exists (
    select 1 from public.organization_members member
    where member.organization_id = organizations.id and member.user_id = (select auth.uid())
  ));

alter policy "members can read organization snapshots" on public.erp_snapshots
  using (exists (
    select 1 from public.organization_members member
    where member.organization_id = erp_snapshots.organization_id and member.user_id = (select auth.uid())
  ));
