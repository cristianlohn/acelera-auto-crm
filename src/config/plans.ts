/**
 * @file plans.ts
 * @description Módulo folha com a definição canônica e pura de planos comerciais do Acelera Auto CRM.
 * Fonte única de verdade para limites de vendedores, precificação (mensal/anual), nomenclatura e formatação.
 */

export type PlanId = "starter" | "pro" | "enterprise";

export const SALES_ROLE_ALIASES = [
  "vendedor",
  "vendedora",
  "seller",
  "consultor",
  "consultora",
] as const;

export type SalesRoleAlias = (typeof SALES_ROLE_ALIASES)[number];

export function isSalesRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase().trim();
  return (SALES_ROLE_ALIASES as readonly string[]).includes(normalized);
}

export interface PlanConfig {
  id: "starter" | "pro" | "enterprise";
  name: string;
  badge?: string;
  sellerLimit: number | null; // null = capacidade personalizada / sob consulta (elimina 999)
  customSellerLimit?: boolean;
  unlimitedSellers?: boolean;
  monthlyPrice: number | null; // null = precificação sob consulta
  annualPrice: number | null;
  startingMonthlyPrice?: number; // R$ 897 (referência visual para Enterprise)
  customPricing?: boolean;
  recommended?: boolean;
  features: string[];
  /** @deprecated Use sellerLimit */
  maxSellers?: number | null;
  /** @deprecated Use monthlyPrice */
  priceMonthly?: number | null;
  /** @deprecated Use annualPrice */
  priceYearly?: number | null;
}

// Preparação para futura cobrança de assentos adicionais (pendência comercial documentada)
export const ADDITIONAL_SELLER_PRICE = 49; // R$ 49/mês por vendedor adicional

export const CANONICAL_PLANS: Record<"starter" | "pro" | "enterprise", PlanConfig> = {
  starter: {
    id: "starter",
    name: "Plano Starter",
    sellerLimit: 3,
    maxSellers: 3,
    monthlyPrice: 297,
    priceMonthly: 297,
    annualPrice: 2970,
    priceYearly: 2970,
    features: [
      "Até 3 vendedores",
      "Gestor e Admin incluídos (não consomem vagas)",
      "Distribuição inteligente por roleta",
      "Gestão de estoque integrada",
      "Suporte padrão",
    ],
  },
  pro: {
    id: "pro",
    name: "Plano Pro",
    badge: "Mais escolhido",
    recommended: true,
    sellerLimit: 8,
    maxSellers: 8,
    monthlyPrice: 497,
    priceMonthly: 497,
    annualPrice: 4970,
    priceYearly: 4970,
    features: [
      "Até 8 vendedores",
      "Gestor e Admin incluídos (não consomem vagas)",
      "Gestão avançada de SLA e alertas críticos",
      "Cockpit completo do gestor",
      "Relatórios e métricas de conversão",
      "Suporte prioritário",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Plano Enterprise",
    sellerLimit: null,
    maxSellers: null,
    customSellerLimit: true,
    monthlyPrice: null,
    priceMonthly: null,
    annualPrice: null,
    priceYearly: null,
    startingMonthlyPrice: 897,
    customPricing: true,
    features: [
      "Equipe e capacidade sob consulta",
      "Múltiplas lojas e filiais",
      "API dedicada e integrações customizadas",
      "Onboarding assistido e gerente de contas",
      "SLA de suporte dedicado",
    ],
  },
};

/**
 * Formatação canônica e visualmente segura da capacidade de vendedores de um plano.
 * NUNCA retorna 999, null, undefined ou NaN.
 */
export function formatPlanSellerLimit(sellerLimit: number | null | undefined): string {
  if (sellerLimit === null || sellerLimit === undefined) {
    return "Equipe personalizada";
  }
  return `Até ${sellerLimit} vendedores`;
}
