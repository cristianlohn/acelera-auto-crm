-- ============================================================================
-- ACELERA AUTO CRM — SCHEMA RELACIONAL & POLÍTICAS RLS (PostgreSQL / Supabase)
-- ============================================================================

-- 1. Extensões essenciais
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Enums para padronização de tipos de domínio
create type public.lead_status as enum (
  'novo',
  'atendimento',
  'visita',
  'proposta',
  'fechado'
);

create type public.lead_origin as enum (
  'whatsapp',
  'instagram',
  'site',
  'indicacao',
  'telefone',
  'olx',
  'icarros',
  'webmotors',
  'indicacao_dono',
  'cliente_carteira',
  'patio_balcao'
);

create type public.vehicle_status as enum (
  'disponivel',
  'reservado',
  'vendido'
);

create type public.fuel_type as enum (
  'flex',
  'gasolina',
  'etanol',
  'diesel',
  'hibrido',
  'eletrico'
);

create type public.transmission_type as enum (
  'automatico',
  'manual',
  'cvt'
);

create type public.user_role as enum (
  'admin',
  'gerente',
  'vendedor'
);

-- ============================================================================
-- 3. Tabelas Principais
-- ============================================================================

-- Organizações (Concessionárias / Lojas - Multi-tenant)
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  document text, -- CNPJ
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Perfis de Utilizador (vinculados ao auth.users do Supabase)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'vendedor',
  email text not null,
  phone text,
  avatar_url text,
  in_roulette boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Veículos em Estoque / Pátio
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  make text not null,
  model text not null,
  version text,
  year_fab integer not null check (year_fab >= 1970 and year_fab <= extract(year from now()) + 1),
  year_model integer not null check (year_model >= year_fab and year_model <= year_fab + 2),
  price numeric(12, 2) not null check (price >= 0),
  mileage integer not null check (mileage >= 0),
  plate_last_digits text not null check (length(plate_last_digits) between 1 and 7),
  color text not null,
  fuel public.fuel_type not null default 'flex',
  transmission public.transmission_type not null default 'automatico',
  status public.vehicle_status not null default 'disponivel',
  photo_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Leads / Oportunidades do Funil Kanban
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  seller_id uuid references public.profiles(id) on delete set null,
  seller_name text not null default 'Sem vendedor',
  name text not null check (length(trim(name)) > 0),
  phone text not null check (length(trim(phone)) >= 8),
  email text,
  vehicle_interest text not null,
  status public.lead_status not null default 'novo',
  origin public.lead_origin not null default 'whatsapp',
  last_contact_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Chaves de API & Integrações Externas (Multi-tenant)
create table public.api_keys (
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

-- ============================================================================
-- 4. Gatilhos (Triggers) para atualização automática de `updated_at`
-- ============================================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tr_organizations_updated_at
  before update on public.organizations
  for each row execute function public.handle_updated_at();

create trigger tr_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger tr_vehicles_updated_at
  before update on public.vehicles
  for each row execute function public.handle_updated_at();

create trigger tr_leads_updated_at
  before update on public.leads
  for each row execute function public.handle_updated_at();

-- ============================================================================
-- 5. Índices para Otimização de Performance
-- ============================================================================

create index idx_vehicles_org_status on public.vehicles (organization_id, status);
create index idx_vehicles_make_model on public.vehicles (make, model);
create index idx_leads_org_status on public.leads (organization_id, status);
create index idx_leads_phone on public.leads (phone);
create index idx_leads_last_contact on public.leads (last_contact_at);

-- ============================================================================
-- 6. Políticas de Segurança em Nível de Linha (Row Level Security - RLS)
-- ============================================================================

-- Habilita RLS em todas as tabelas
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.leads enable row level security;

-- Função auxiliar para obter a organização do utilizador logado
create or replace function public.current_org_id()
returns uuid as $$
  select organization_id from public.profiles where id = auth.uid() limit 1;
$$ language sql stable security definer;

-- Políticas para `organizations`
create policy "Utilizadores visualizam a sua própria organização"
  on public.organizations for select
  using (
    id = public.current_org_id()
    or auth.jwt()->>'role' = 'service_role'
  );

create policy "Permitir inserção de organização no cadastro"
  on public.organizations for insert
  with check (true);

create policy "Admins atualizam sua organização"
  on public.organizations for update
  using (
    id = public.current_org_id()
    or auth.jwt()->>'role' = 'service_role'
  );

-- Políticas para `profiles`
create policy "Perfis visíveis dentro da mesma organização"
  on public.profiles for select
  using (
    organization_id = public.current_org_id()
    or id = auth.uid()
    or auth.jwt()->>'role' = 'service_role'
  );

create policy "Utilizador cria o seu próprio perfil"
  on public.profiles for insert
  with check (
    id = auth.uid()
    or auth.jwt()->>'role' = 'service_role'
  );

create policy "Utilizador atualiza o seu próprio perfil"
  on public.profiles for update
  using (
    id = auth.uid()
    or auth.jwt()->>'role' = 'service_role'
  );

-- Políticas para `vehicles` (CRUD completo restrito à organização do utilizador)
create policy "Acesso a veículos da organização"
  on public.vehicles for all
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

-- Políticas para `leads` (CRUD completo restrito à organização do utilizador)
create policy "Acesso a leads da organização"
  on public.leads for all
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());