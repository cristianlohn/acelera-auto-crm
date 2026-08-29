-- ============================================================================
-- ACELERA AUTO CRM — HABILITAÇÃO DO SUPABASE REALTIME NA TABELA LEADS
-- ============================================================================

-- Garante identidade completa da linha para publicação de payloads detalhados
alter table public.leads replica identity full;

-- Adiciona a tabela leads à publicação supabase_realtime
do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    alter publication supabase_realtime add table public.leads;
  end if;
end
$$;
