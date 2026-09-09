-- ============================================================================
-- ACELERA AUTO CRM — TABELA DE CHAVES DE API & INTEGRAÇÕES EXTERNAS (api_keys)
-- ============================================================================

-- 1. Criação da tabela de api_keys
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text unique not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz
);

-- 2. Índices de alta performance
create index if not exists idx_api_keys_key_hash on public.api_keys(key_hash);
create index if not exists idx_api_keys_org_active on public.api_keys(organization_id, revoked_at);

-- 3. Habilita Row Level Security (RLS)
alter table public.api_keys enable row level security;

-- 4. Política RLS: Usuários autenticados só acessam chaves da própria organização
drop policy if exists "api_keys_tenant_isolation" on public.api_keys;
create policy "api_keys_tenant_isolation"
  on public.api_keys for all
  using (
    organization_id in (
      select organization_id from public.profiles where id = auth.uid()
    )
  )
  with check (
    organization_id in (
      select organization_id from public.profiles where id = auth.uid()
    )
  );
