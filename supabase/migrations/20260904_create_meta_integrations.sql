-- Migration: Criação da tabela de integrações da Meta (Facebook / Instagram Lead Ads)
-- Data: 2026-09-04

CREATE TABLE IF NOT EXISTS public.meta_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL UNIQUE,
  page_name TEXT,
  page_access_token TEXT NOT NULL,
  verify_token TEXT NOT NULL DEFAULT 'acelera_meta_webhook_secret',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para busca de alta performance por page_id no webhook
CREATE INDEX IF NOT EXISTS idx_meta_integrations_page_id ON public.meta_integrations(page_id);
CREATE INDEX IF NOT EXISTS idx_meta_integrations_org_id ON public.meta_integrations(organization_id);

-- Habilitar RLS
ALTER TABLE public.meta_integrations ENABLE ROW LEVEL SECURITY;

-- Política de isolamento multi-tenant
CREATE POLICY "meta_integrations_org_isolation" ON public.meta_integrations
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );
