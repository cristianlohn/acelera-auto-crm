-- ============================================================================
-- ACELERA AUTO CRM — SCHEMA DE FATURAMENTO E NOTAS FISCAIS ASAAS (BILLING_INVOICES)
-- ============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Colunas de faturamento na tabela organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'trialing',
ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ DEFAULT NULL;

-- Tabela de faturas e notas fiscais padronizada
CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  asaas_payment_id TEXT,
  asaas_invoice_id TEXT,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  invoice_url TEXT,
  pdf_url TEXT,
  xml_url TEXT,
  number TEXT,
  verification_code TEXT,
  failure_reason TEXT,
  service_description TEXT,
  effective_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir colunas complementares se a tabela já existia
ALTER TABLE public.billing_invoices
ADD COLUMN IF NOT EXISTS xml_url TEXT,
ADD COLUMN IF NOT EXISTS number TEXT,
ADD COLUMN IF NOT EXISTS verification_code TEXT,
ADD COLUMN IF NOT EXISTS failure_reason TEXT,
ADD COLUMN IF NOT EXISTS service_description TEXT,
ADD COLUMN IF NOT EXISTS effective_date DATE;

-- Índices otimizados
CREATE INDEX IF NOT EXISTS idx_billing_invoices_org_id ON public.billing_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_asaas_payment ON public.billing_invoices(asaas_payment_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_asaas_invoice ON public.billing_invoices(asaas_invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_status ON public.billing_invoices(status);

-- Habilitar RLS
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Users can view billing invoices of their own organization"
  ON public.billing_invoices
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage billing invoices of their own organization"
  ON public.billing_invoices
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'gerente')
    )
  );
