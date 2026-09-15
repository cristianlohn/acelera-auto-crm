-- Adiciona a coluna whatsapp_lead_capture_enabled à tabela organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS whatsapp_lead_capture_enabled BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN organizations.whatsapp_lead_capture_enabled IS 'Indica se a captura automática de leads via WhatsApp está ativa para esta organização.';
