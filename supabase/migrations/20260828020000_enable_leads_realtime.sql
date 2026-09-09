-- ============================================================================
-- ACELERA AUTO CRM — HABILITAÇÃO DO SUPABASE REALTIME NA TABELA LEADS
-- ============================================================================

-- Garante identidade completa da linha para publicação de payloads detalhados
alter table public.leads replica identity full;

-- Adiciona a tabela leads à publicação supabase_realtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'leads') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  END IF;
END
$$;
