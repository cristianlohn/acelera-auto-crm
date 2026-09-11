/**
 * @file plans.ts
 * @description Módulo folha com a definição canônica e pura de planos comerciais do Acelera Auto CRM.
 * Fonte única de verdade para limites de vendedores, precificação (mensal/anual) e nomenclatura.
 */

export type PlanId = "starter" | "pro" | "enterprise";

export interface PlanConfig {
  id: PlanId;
  name: string;
  maxSellers: number;
  priceMonthly: number;
  priceYearly: number; // Ex: Pro: 5970 (10 meses pagos, 2 grátis)
  features: string[];
}

export const CANONICAL_PLANS: Record<PlanId, PlanConfig> = {
  starter: {
    id: "starter",
    name: "Plano Starter",
    maxSellers: 3, // Resolução canônica (3 vendedores)
    priceMonthly: 297,
    priceYearly: 2970,
    features: [
      "Até 3 vendedores",
      "Distribuição inteligente",
      "Gestão de estoque",
      "Suporte padrão",
    ],
  },
  pro: {
    id: "pro",
    name: "Plano Pro",
    maxSellers: 8, // Resolução canônica (8 vendedores)
    priceMonthly: 597,
    priceYearly: 5970,
    features: [
      "Até 8 vendedores",
      "Gestão avançada de SLA",
      "Cockpit do gestor",
      "Suporte prioritário",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Plano Enterprise",
    maxSellers: 999, // Ilimitado canônico
    priceMonthly: 1297,
    priceYearly: 12970,
    features: [
      "Vendedores ilimitados",
      "Múltiplas lojas",
      "API dedicada",
      "Gerente de contas",
    ],
  },
};
