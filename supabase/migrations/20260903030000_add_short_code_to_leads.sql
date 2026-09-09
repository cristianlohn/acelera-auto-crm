-- Migration: 20260903_add_short_code_to_leads.sql
-- Descrição: Adiciona coluna short_code indexada e única na tabela leads para links curtos de WhatsApp e CRM (/w/[code] e /c/[code]).

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS short_code VARCHAR(10) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_leads_short_code ON leads(short_code);
