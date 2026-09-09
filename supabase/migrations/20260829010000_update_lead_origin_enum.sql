-- ============================================================================
-- Migration: 20260829_update_lead_origin_enum.sql
-- Descrição: Sincroniza o ENUM `lead_origin` com os canais canônicos do CRM
--            ('webmotors', 'indicacao_dono', 'cliente_carteira', 'patio_balcao').
-- ============================================================================

ALTER TYPE public.lead_origin ADD VALUE IF NOT EXISTS 'webmotors';
ALTER TYPE public.lead_origin ADD VALUE IF NOT EXISTS 'indicacao_dono';
ALTER TYPE public.lead_origin ADD VALUE IF NOT EXISTS 'cliente_carteira';
ALTER TYPE public.lead_origin ADD VALUE IF NOT EXISTS 'patio_balcao';
