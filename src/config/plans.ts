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
      "Até 3 vendedores inclusos (gestores isentos)",
      "Cockpit do Gestor com alertas em tempo real",
      "Monitoramento de SLA de Primeiro Atendimento",
      "Roleta inteligente de distribuição de leads (Round-Robin)",
      "Perfis com visão separada (Gestor vs. Vendedor)",
      "Gestão de estoque e carteira de clientes",
      "Contato com o lead via WhatsApp em 1 clique",
      "Implantação assistida incluída (R$ 0 setup)",
    ],
  },
  pro: {
    id: "pro",
    name: "Plano Pro",
    badge: "Recomendado",
    recommended: true,
    sellerLimit: 8,
    maxSellers: 8,
    monthlyPrice: 497,
    priceMonthly: 497,
    annualPrice: 4970,
    priceYearly: 4970,
    features: [
      "Todos os recursos do Plano Starter +",
      "Até 8 vendedores inclusos (gestores isentos)",
      "Possibilidade de adicionar vendedores extras (R$ 49/mês)",
      "Relatórios analíticos de funil e taxa de conversão",
      "Auditoria de motivos de perda e desempenho individual",
      "Exportação de dados e relatórios em CSV",
      "Suporte prioritário via WhatsApp",
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
      "Todos os recursos do Plano Pro +",
      "Volume de vendedores customizado em contrato",
      "Condições especiais para redes com múltiplos CNPJs",
      "Suporte à integração direta via Webhooks e API",
      "Onboarding assistido com gerente de contas dedicado",
      "SLA de suporte prioritário",
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
  return `Até ${sellerLimit} vendedores inclusos (gestores isentos)`;
}

