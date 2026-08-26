/**
 * @file superadmin-data.ts
 * @description Dados e funções utilitárias puras para o módulo Backoffice Super Admin.
 */

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid";

export type DealershipPlan = "starter" | "pro" | "enterprise";

export interface DealershipAccount {
  id: string;
  name: string;
  slug: string;
  document: string;
  city: string;
  state: string;
  managerName: string;
  managerEmail: string;
  managerPhone: string;
  plan: DealershipPlan;
  status: SubscriptionStatus;
  monthlyFee: number;
  sellersCount: number;
  vehiclesCount: number;
  leadsCount: number;
  trialEndsAt: string; // ISO String
  currentPeriodEnd: string; // ISO String
  createdAt: string;
}

export interface SuperAdminMetrics {
  mrr: number;
  activeStores: number;
  trialStores: number;
  expiringTrialsCount: number;
  totalVehiclesManaged: number;
  totalLeadsManaged: number;
}

const now = Date.now();
const ONE_DAY_MS = 86_400_000;

export const mockDealerships: DealershipAccount[] = [
  {
    id: "org-001",
    name: "Auto Prime Veículos",
    slug: "auto-prime",
    document: "12.345.678/0001-90",
    city: "São Paulo",
    state: "SP",
    managerName: "Roberto Silva",
    managerEmail: "roberto@autoprime.com.br",
    managerPhone: "11988887777",
    plan: "pro",
    status: "active",
    monthlyFee: 497,
    sellersCount: 8,
    vehiclesCount: 42,
    leadsCount: 156,
    trialEndsAt: new Date(now - 30 * ONE_DAY_MS).toISOString(),
    currentPeriodEnd: new Date(now + 24 * ONE_DAY_MS).toISOString(),
    createdAt: new Date(now - 60 * ONE_DAY_MS).toISOString(),
  },
  {
    id: "org-002",
    name: "Imperial Motors",
    slug: "imperial-motors",
    document: "98.765.432/0001-10",
    city: "Curitiba",
    state: "PR",
    managerName: "Carlos Eduardo",
    managerEmail: "carlos@imperialmotors.com.br",
    managerPhone: "41999991111",
    plan: "pro",
    status: "trialing",
    monthlyFee: 497,
    sellersCount: 4,
    vehiclesCount: 19,
    leadsCount: 64,
    // Expira em 1 dia (alerta <= 48h)
    trialEndsAt: new Date(now + 1 * ONE_DAY_MS).toISOString(),
    currentPeriodEnd: new Date(now + 1 * ONE_DAY_MS).toISOString(),
    createdAt: new Date(now - 13 * ONE_DAY_MS).toISOString(),
  },
  {
    id: "org-003",
    name: "Vanguard Automóveis",
    slug: "vanguard-auto",
    document: "45.123.789/0001-55",
    city: "Belo Horizonte",
    state: "MG",
    managerName: "Mariana Costa",
    managerEmail: "mariana@vanguardauto.com.br",
    managerPhone: "31998882222",
    plan: "pro",
    status: "trialing",
    monthlyFee: 497,
    sellersCount: 6,
    vehiclesCount: 28,
    leadsCount: 92,
    trialEndsAt: new Date(now + 6 * ONE_DAY_MS).toISOString(),
    currentPeriodEnd: new Date(now + 6 * ONE_DAY_MS).toISOString(),
    createdAt: new Date(now - 8 * ONE_DAY_MS).toISOString(),
  },
  {
    id: "org-004",
    name: "Elite Car Motors",
    slug: "elite-car",
    document: "33.666.999/0001-44",
    city: "Rio de Janeiro",
    state: "RJ",
    managerName: "Bruno Albuquerque",
    managerEmail: "bruno@elitecar.com.br",
    managerPhone: "21977773333",
    plan: "enterprise",
    status: "active",
    monthlyFee: 1290,
    sellersCount: 18,
    vehiclesCount: 85,
    leadsCount: 310,
    trialEndsAt: new Date(now - 90 * ONE_DAY_MS).toISOString(),
    currentPeriodEnd: new Date(now + 18 * ONE_DAY_MS).toISOString(),
    createdAt: new Date(now - 120 * ONE_DAY_MS).toISOString(),
  },
  {
    id: "org-005",
    name: "Sul Veículos Multimarcas",
    slug: "sul-veiculos",
    document: "77.888.111/0001-22",
    city: "Porto Alegre",
    state: "RS",
    managerName: "Fernando Souza",
    managerEmail: "fernando@sulveiculos.com.br",
    managerPhone: "51996664444",
    plan: "starter",
    status: "past_due",
    monthlyFee: 297,
    sellersCount: 3,
    vehiclesCount: 12,
    leadsCount: 45,
    trialEndsAt: new Date(now - 45 * ONE_DAY_MS).toISOString(),
    currentPeriodEnd: new Date(now - 3 * ONE_DAY_MS).toISOString(),
    createdAt: new Date(now - 75 * ONE_DAY_MS).toISOString(),
  },
  {
    id: "org-006",
    name: "Master Motors Goiânia",
    slug: "master-motors",
    document: "55.444.333/0001-88",
    city: "Goiânia",
    state: "GO",
    managerName: "Juliana Prado",
    managerEmail: "juliana@mastermotors.com.br",
    managerPhone: "62991115555",
    plan: "pro",
    status: "canceled",
    monthlyFee: 497,
    sellersCount: 5,
    vehiclesCount: 22,
    leadsCount: 78,
    trialEndsAt: new Date(now - 15 * ONE_DAY_MS).toISOString(),
    currentPeriodEnd: new Date(now - 15 * ONE_DAY_MS).toISOString(),
    createdAt: new Date(now - 45 * ONE_DAY_MS).toISOString(),
  },
];

/**
 * Calcula se o trial de uma conta expira em <= 48 horas a partir de agora.
 */
export function isExpiringSoon(trialEndsAt: string): boolean {
  const end = new Date(trialEndsAt).getTime();
  const diffHours = (end - Date.now()) / (1000 * 60 * 60);
  return diffHours > 0 && diffHours <= 48;
}
