-- ============================================================================
-- Migration: 20260827_multi_tenant_rls_policies.sql
-- Descrição: Políticas de Segurança RLS (Row Level Security) rigorosamente isoladas
--            para todas as tabelas multi-tenant do Acelera Auto CRM.
-- ============================================================================

-- 1. Garante a existência da função de resolução de organização do usuário
create or replace function public.current_org_id()
returns uuid as $$
  select organization_id from public.profiles where id = auth.uid() limit 1;
$$ language sql stable security definer;

-- 2. Habilitação de RLS em todas as tabelas
alter table if exists public.organizations enable row level security;
alter table if exists public.profiles enable row level security;
alter table if exists public.vehicles enable row level security;
alter table if exists public.leads enable row level security;
alter table if exists public.lead_notes enable row level security;
alter table if exists public.lead_activities enable row level security;
alter table if exists public.roleta_queue enable row level security;
alter table if exists public.roleta_logs enable row level security;
alter table if exists public.api_keys enable row level security;

-- 3. Políticas para `organizations`
drop policy if exists "Utilizadores visualizam a sua própria organização" on public.organizations;
drop policy if exists "Permitir inserção de organização no cadastro" on public.organizations;
drop policy if exists "Admins atualizam sua organização" on public.organizations;

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

-- 4. Políticas para `profiles` (Membros da Equipe)
drop policy if exists "Perfis visíveis dentro da mesma organização" on public.profiles;
drop policy if exists "Utilizador cria o seu próprio perfil" on public.profiles;
drop policy if exists "Utilizador atualiza o seu próprio perfil" on public.profiles;
drop policy if exists "Admins removem perfis da sua organização" on public.profiles;

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

create policy "Admins removem perfis da sua organização"
  on public.profiles for delete
  using (
    organization_id = public.current_org_id()
    or auth.jwt()->>'role' = 'service_role'
  );

-- 5. Políticas para `leads` (Isolamento Estrito de Leads)
drop policy if exists "Acesso a leads da organização" on public.leads;
drop policy if exists "leads_select_tenant" on public.leads;
drop policy if exists "leads_insert_tenant" on public.leads;
drop policy if exists "leads_update_tenant" on public.leads;
drop policy if exists "leads_delete_tenant" on public.leads;

create policy "leads_select_tenant"
  on public.leads for select
  using (
    organization_id = public.current_org_id()
    or auth.jwt()->>'role' = 'service_role'
  );

create policy "leads_insert_tenant"
  on public.leads for insert
  with check (
    organization_id = public.current_org_id()
    or auth.jwt()->>'role' = 'service_role'
  );

create policy "leads_update_tenant"
  on public.leads for update
  using (
    organization_id = public.current_org_id()
    or auth.jwt()->>'role' = 'service_role'
  );

create policy "leads_delete_tenant"
  on public.leads for delete
  using (
    organization_id = public.current_org_id()
    or auth.jwt()->>'role' = 'service_role'
  );

-- 6. Políticas para `vehicles` (Estoque de Veículos)
drop policy if exists "Acesso a veículos da organização" on public.vehicles;
drop policy if exists "vehicles_tenant_isolation" on public.vehicles;

create policy "vehicles_tenant_isolation"
  on public.vehicles for all
  using (
    organization_id = public.current_org_id()
    or auth.jwt()->>'role' = 'service_role'
  )
  with check (
    organization_id = public.current_org_id()
    or auth.jwt()->>'role' = 'service_role'
  );

-- 7. Políticas para `api_keys` (Chaves de Integração)
drop policy if exists "api_keys_tenant_isolation" on public.api_keys;

create policy "api_keys_tenant_isolation"
  on public.api_keys for all
  using (
    organization_id = public.current_org_id()
    or auth.jwt()->>'role' = 'service_role'
  )
  with check (
    organization_id = public.current_org_id()
    or auth.jwt()->>'role' = 'service_role'
  );
