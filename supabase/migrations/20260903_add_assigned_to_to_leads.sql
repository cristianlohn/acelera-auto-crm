-- Migration: 20260903_add_assigned_to_to_leads.sql
-- Descrição: Adiciona coluna assigned_to indexada na tabela leads referenciando auth.users(id) e recarrega o cache do PostgREST.

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);

-- Recarregar o cache de schema do PostgREST
NOTIFY pgrst, 'reload schema';
