-- ============================================================================
-- ACELERA AUTO CRM — CAMPOS DE UPGRADE PENDENTE EM ORGANIZAÇÕES
-- ============================================================================

-- Adiciona colunas para rastreamento de upgrade pendente na tabela organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS pending_plan TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pending_invoice_id TEXT DEFAULT NULL;

-- Notifica o PostgREST para recarregar o schema cache
NOTIFY pgrst, 'reload schema';
