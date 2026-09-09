-- ============================================================================
-- ACELERA AUTO CRM — PROVISIONAMENTO ATÔMICO VIA TRIGGER (handle_new_user)
-- ============================================================================
-- Descrição:
-- Padroniza o provisionamento de novos lojistas diretamente no PostgreSQL.
-- Ao disparar o evento AFTER INSERT em auth.users:
-- 1. Cria a organização vinculada ao tenant com:
--    - name: store_name exato digitado no formulário (fallback: [Nome] Veículos)
--    - slug único gerado a partir do nome real
--    - plan: 'trial'
--    - subscription_status: 'trialing'
--    - trial_ends_at: now() + 14 dias
--    - business_hours: JSON canônico (Seg-Sex 08:30-18:30, Sáb 09:00-13:00, Dom fechado, sla_mode: 'business_hours')
-- 2. Cria o perfil do usuário em public.profiles como 'admin'::public.user_role.
-- ============================================================================

-- Garante que as colunas necessárias existam de forma idempotente na tabela organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing',
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS business_hours TEXT DEFAULT NULL;

-- 1. Função handle_new_user com SECURITY DEFINER e search_path seguro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_org_id UUID;
  user_full_name TEXT;
  user_phone TEXT;
  store_title TEXT;
  org_slug TEXT;
  default_business_hours JSONB;
BEGIN
  -- 1. Dados cadastrais do Gestor
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'fullName',
    split_part(NEW.email, '@', 1)
  );

  user_phone := NULLIF(TRIM(COALESCE(
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'whatsapp'
  )), '');

  -- 2. Nome da Concessionária informado no formulário (sem concatenar forçado com ' Motors')
  store_title := NULLIF(TRIM(COALESCE(
    NEW.raw_user_meta_data->>'store_name',
    NEW.raw_user_meta_data->>'storeName',
    NEW.raw_user_meta_data->>'dealership_name',
    NEW.raw_user_meta_data->>'organization_name'
  )), '');

  -- Fallback seguro apenas se o campo vier vazio
  IF store_title IS NULL THEN
    store_title := user_full_name || ' Veículos';
  END IF;

  -- 3. Slug único para isolamento multi-tenant
  org_slug := lower(regexp_replace(store_title, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(NEW.id::text, 1, 6);

  -- 4. Matriz canônica de Horários e SLA (DEFAULT_AUTOMOTIVE_SCHEDULE conforme CRM_CONTEXT.md)
  -- Seg-Sex 08:30-18:30, Sáb 09:00-13:00, Dom fechado, sla_mode: 'business_hours'
  default_business_hours := jsonb_build_object(
    'slaMode', 'business_hours',
    'sla_mode', 'business_hours',
    'schedule', jsonb_build_object(
      '1', jsonb_build_object('isOpen', true,  'openTime', '08:30', 'closeTime', '18:30'),
      '2', jsonb_build_object('isOpen', true,  'openTime', '08:30', 'closeTime', '18:30'),
      '3', jsonb_build_object('isOpen', true,  'openTime', '08:30', 'closeTime', '18:30'),
      '4', jsonb_build_object('isOpen', true,  'openTime', '08:30', 'closeTime', '18:30'),
      '5', jsonb_build_object('isOpen', true,  'openTime', '08:30', 'closeTime', '18:30'),
      '6', jsonb_build_object('isOpen', true,  'openTime', '09:00', 'closeTime', '13:00'),
      '0', jsonb_build_object('isOpen', false, 'openTime', '09:00', 'closeTime', '13:00')
    )
  );

  -- 5. Criação da Organização com Trial de 14 dias e SLA padronizado
  INSERT INTO public.organizations (
    name,
    slug,
    plan,
    subscription_status,
    trial_ends_at,
    business_hours,
    created_at,
    updated_at
  )
  VALUES (
    store_title,
    org_slug,
    'trial',
    'trialing',
    now() + interval '14 days',
    default_business_hours::text,
    now(),
    now()
  )
  RETURNING id INTO new_org_id;

  -- 6. Criação do Perfil vinculado como admin (minúsculo obrigatório)
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    role,
    organization_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    user_phone,
    'admin'::public.user_role,
    new_org_id,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    role = EXCLUDED.role,
    updated_at = now();

  RETURN NEW;
END;
$function$;

-- 2. Vinculação atômica da trigger ao auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Notifica o PostgREST para recarregar o schema cache
NOTIFY pgrst, 'reload schema';