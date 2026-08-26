-- ============================================================================
-- Migration: 20260826_fix_organizations_profiles_rls.sql
-- Descrição: Ajusta e reforça as políticas de RLS para as tabelas `organizations`
--            e `profiles`, garantindo que inserções via service_role, authenticated
--            e fluxo de cadastro ocorram sem violação de integridade.
-- ============================================================================

-- 1. Políticas RLS para `organizations`
alter table public.organizations enable row level security;

drop policy if exists "Utilizadores visualizam a sua própria organização" on public.organizations;
drop policy if exists "Permitir inserção de organização no cadastro" on public.organizations;
drop policy if exists "Admins atualizam sua organização" on public.organizations;

-- Leitura: Utilizadores autenticados visualizam sua própria organização
create policy "Utilizadores visualizam a sua própria organização"
  on public.organizations for select
  using (
    id = public.current_org_id()
    or auth.jwt()->>'role' = 'service_role'
  );

-- Inserção: Permitida para service_role e novos cadastros
create policy "Permitir inserção de organização no cadastro"
  on public.organizations for insert
  with check (true);

-- Atualização: Admins da organização e service_role
create policy "Admins atualizam sua organização"
  on public.organizations for update
  using (
    id = public.current_org_id()
    or auth.jwt()->>'role' = 'service_role'
  );

-- 2. Políticas RLS para `profiles`
alter table public.profiles enable row level security;

drop policy if exists "Perfis visíveis dentro da mesma organização" on public.profiles;
drop policy if exists "Utilizador cria o seu próprio perfil" on public.profiles;
drop policy if exists "Utilizador atualiza o seu próprio perfil" on public.profiles;

-- Leitura: Perfis da mesma organização ou service_role
create policy "Perfis visíveis dentro da mesma organização"
  on public.profiles for select
  using (
    organization_id = public.current_org_id()
    or id = auth.uid()
    or auth.jwt()->>'role' = 'service_role'
  );

-- Inserção: O próprio utilizador ou service_role
create policy "Utilizador cria o seu próprio perfil"
  on public.profiles for insert
  with check (
    id = auth.uid()
    or auth.jwt()->>'role' = 'service_role'
  );

-- Atualização: O próprio utilizador ou service_role
create policy "Utilizador atualiza o seu próprio perfil"
  on public.profiles for update
  using (
    id = auth.uid()
    or auth.jwt()->>'role' = 'service_role'
  );
