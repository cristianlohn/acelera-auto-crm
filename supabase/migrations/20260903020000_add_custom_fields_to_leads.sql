-- Migration: 20260903_add_custom_fields_to_leads.sql
-- Descrição: Adiciona coluna custom_fields JSONB na tabela leads para suporte a metadados flexíveis de webhooks e recarrega o cache do PostgREST.

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- Recarregar o cache de schema do PostgREST
NOTIFY pgrst, 'reload schema';
