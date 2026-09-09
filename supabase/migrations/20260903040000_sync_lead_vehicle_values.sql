-- ============================================================================
-- ACELERA AUTO CRM — SINCRONIZAÇÃO DE COLUNAS DE VALOR E VEÍCULO EM LEADS
-- ============================================================================

-- 1. Garante que as colunas existam na tabela leads
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS estimated_value NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS value NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS vehicle_name TEXT;

-- 2. Sincroniza dados existentes a partir de custom_fields (caso estejam lá)
UPDATE public.leads
SET
  estimated_value = COALESCE(
    (custom_fields->>'estimated_value')::numeric,
    (custom_fields->>'value')::numeric,
    (custom_fields->>'price')::numeric,
    estimated_value,
    0
  ),
  value = COALESCE(
    (custom_fields->>'estimated_value')::numeric,
    (custom_fields->>'value')::numeric,
    (custom_fields->>'price')::numeric,
    value,
    0
  ),
  vehicle_name = COALESCE(
    custom_fields->>'vehicle_name',
    vehicle_name,
    vehicle_interest
  )
WHERE custom_fields IS NOT NULL;

-- 3. Sincroniza o estimated_value de leads que possuem vehicle_id vinculado
UPDATE public.leads l
SET 
  estimated_value = COALESCE(v.price, 0),
  value = COALESCE(v.price, 0)
FROM public.vehicles v
WHERE l.vehicle_id = v.id
  AND (l.estimated_value IS NULL OR l.estimated_value = 0);

-- 4. Recarrega o cache do PostgREST
NOTIFY pgrst, 'reload schema';
