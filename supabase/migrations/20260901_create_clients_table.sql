-- ============================================================================
-- ACELERA AUTO CRM — TABELA PUBLIC.CLIENTS E ISOLAMENTO MULTI-TENANT
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  document TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'comprador', 'inativo')),
  seller_name TEXT NOT NULL DEFAULT 'Roleta Automática',
  seller_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  vehicle_preference TEXT,
  total_purchased NUMERIC(12, 2) NOT NULL DEFAULT 0,
  purchases_count INTEGER NOT NULL DEFAULT 0,
  last_interaction_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices para buscas rápidas e isolamento multi-tenant
CREATE INDEX IF NOT EXISTS idx_clients_org_id ON public.clients (organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients (phone);

-- Ativação de Row Level Security (RLS)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "clients_isolation_policy" ON public.clients
  FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );
