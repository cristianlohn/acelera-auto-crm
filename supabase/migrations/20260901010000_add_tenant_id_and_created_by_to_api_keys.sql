-- ============================================================================
-- ACELERA AUTO CRM — ATUALIZAÇÃO DA TABELA api_keys (Multi-Tenant & Audit)
-- ============================================================================

-- 1. Garante colunas tenant_id, created_by e status para conformidade SaaS estrita
alter table if exists public.api_keys 
  add column if not exists tenant_id uuid references public.organizations(id) on delete cascade,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists status text not null default 'active';

-- 2. Sincronização retroativa entre organization_id e tenant_id
update public.api_keys 
set tenant_id = organization_id 
where tenant_id is null and organization_id is not null;

update public.api_keys 
set organization_id = tenant_id 
where organization_id is null and tenant_id is not null;

-- 3. Índices de busca de alta performance por tenant_id e created_by
create index if not exists idx_api_keys_tenant_id on public.api_keys(tenant_id);
create index if not exists idx_api_keys_created_by on public.api_keys(created_by);
create index if not exists idx_api_keys_tenant_status on public.api_keys(tenant_id, status);

-- 4. Atualização da política de isolamento RLS (Row Level Security)
drop policy if exists "api_keys_tenant_isolation" on public.api_keys;
create policy "api_keys_tenant_isolation"
  on public.api_keys for all
  using (
    organization_id in (
      select organization_id from public.profiles where id = auth.uid()
    )
    or
    tenant_id in (
      select organization_id from public.profiles where id = auth.uid()
    )
  )
  with check (
    organization_id in (
      select organization_id from public.profiles where id = auth.uid()
    )
    or
    tenant_id in (
      select organization_id from public.profiles where id = auth.uid()
    )
  );
