-- ============================================================================
-- ACELERA AUTO CRM — RASTREAMENTO DE AQUISIÇÃO E ATRIBUIÇÃO DE TRÁFEGO (UTMs)
-- ============================================================================
-- Registra a origem de aquisição de novas organizações (ex: bio do Instagram, Meta Ads, Google)
-- através de parâmetros UTM capturados no primeiro acesso.

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS acquisition_source VARCHAR(100) DEFAULT 'direct',
ADD COLUMN IF NOT EXISTS acquisition_medium VARCHAR(100),
ADD COLUMN IF NOT EXISTS acquisition_campaign VARCHAR(100),
ADD COLUMN IF NOT EXISTS acquisition_metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN organizations.acquisition_source IS 'Canal de origem (ex: instagram, google, direct)';
COMMENT ON COLUMN organizations.acquisition_metadata IS 'Payload completo da UTM e landing page do primeiro acesso';
