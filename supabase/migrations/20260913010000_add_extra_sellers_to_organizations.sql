-- Adiciona suporte a vagas extras de vendedores por organização
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS extra_sellers_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS extra_sellers_cycle VARCHAR(20) DEFAULT 'monthly';

COMMENT ON COLUMN organizations.extra_sellers_count IS 'Número de assentos adicionais de vendedores contratados a R$ 49/mês';
COMMENT ON COLUMN organizations.extra_sellers_cycle IS 'Ciclo de cobrança dos assentos adicionais: monthly ou yearly';
