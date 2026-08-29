-- ============================================================================
-- ACELERA AUTO CRM — COLUNA DE PLANTÃO/ROLETA EM PROFILES
-- ============================================================================

-- Adiciona a coluna in_roulette na tabela profiles caso não exista
alter table public.profiles add column if not exists in_roulette boolean not null default true;

-- Índice para otimizar a consulta da roleta comercial
create index if not exists idx_profiles_roulette_org on public.profiles(organization_id, in_roulette);
