-- ============================================================================
-- ACELERA AUTO CRM — HABILITAÇÃO DO SUPABASE REALTIME NA TABELA LEADS
-- ============================================================================

-- Habilita replicação completa para capturar alterações no payload Realtime
ALTER TABLE public.leads REPLICA IDENTITY FULL;

-- Adiciona a tabela leads à publicação supabase_realtime (se ainda não adicionada)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  END IF;
END $$;
