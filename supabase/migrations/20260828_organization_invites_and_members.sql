-- ============================================================================
-- ACELERA AUTO CRM — GESTÃO DE CONVITES PENDENTES E VÍNCULOS MULTI-TENANT
-- ============================================================================

-- 1. Tabela de Convites de Organização
create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  full_name text not null,
  phone text,
  role text not null default 'seller',
  token text unique default gen_random_uuid()::text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Tabela de Membros de Organização (para suportar usuários multi-loja / histórico)
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'seller',
  status text not null default 'active' check (status in ('pending', 'active', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, user_id)
);

-- 3. Índices para performance
create index if not exists idx_org_invites_token on public.organization_invites(token);
create index if not exists idx_org_invites_email on public.organization_invites(email);
create index if not exists idx_org_invites_org on public.organization_invites(organization_id);
create index if not exists idx_org_members_user on public.organization_members(user_id);
create index if not exists idx_org_members_org on public.organization_members(organization_id);

-- 4. RLS para organization_invites e organization_members
alter table public.organization_invites enable row level security;
alter table public.organization_members enable row level security;

create policy "Admins e Gerentes gerenciam convites de sua organizacao"
  on public.organization_invites
  for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.organization_id = organization_invites.organization_id
        and profiles.role in ('admin', 'gerente')
    )
  );

create policy "Membros visualizam membros de sua organizacao"
  on public.organization_members
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.organization_id = organization_members.organization_id
    )
  );
