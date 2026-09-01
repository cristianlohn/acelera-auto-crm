-- Migration: Criação da tabela de instâncias do WhatsApp (Evolution API)
-- Data: 2026-09-01

CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected',
  qr_code TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT whatsapp_instances_org_unique UNIQUE (organization_id)
);

-- Habilitar RLS
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Política de isolamento multi-tenant
CREATE POLICY "whatsapp_instances_org_isolation" ON public.whatsapp_instances
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );
