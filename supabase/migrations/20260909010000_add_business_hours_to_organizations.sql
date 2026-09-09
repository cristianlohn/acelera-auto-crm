-- ============================================================================
-- ACELERA AUTO CRM — HORÁRIOS DE ATENDIMENTO E SLA DA LOJA
-- ============================================================================

-- Adiciona a coluna business_hours (JSON serializado de StoreBusinessHours) na tabela organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS business_hours TEXT DEFAULT NULL;

-- Notifica o PostgREST para recarregar o schema cache
NOTIFY pgrst, 'reload schema';
