/**
 * @file team-data.ts
 * @description Tipagens e dados mock para o módulo de Gestão de Equipe e Capacidade Multi-Tenant.
 */

export type UserRole = "admin" | "gerente" | "vendedor";
export type MemberStatus = "active" | "pending";

export interface TeamMember {
  id: string;
  organizationId: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: MemberStatus;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface OrgCapacityInput {
  plan?: string | null;
  max_sellers?: number | null;
  extra_sellers_count?: number | null;
  extra_sellers_cycle?: "monthly" | "yearly" | string | null;
  enterprise_unlimited?: boolean | null;
  unlimited_sellers?: boolean | null;
}

export interface TeamCapacity {
  baseLimit: number | null;
  extraSellersCount: number;
  effectiveLimit: number | null; // null = ilimitado
  currentSalesCount: number;
  exemptMembersCount: number;
  remainingSlots: number | null;
  isLimitReached: boolean;
  canAddExtra: boolean; // true para Starter e Pro

  // Campos legados para compatibilidade total
  currentCount: number;
  maxSellers: number | null;
  plan?: "starter" | "pro" | "enterprise";
  planName: string;
  hasAvailableSlots: boolean;
}

export interface InviteMemberInput {
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
}

export interface InviteResult {
  success: boolean;
  emailSent?: boolean;
  fallbackInviteLink?: string;
  error?: string;
  code?: string;
  canAddExtra?: boolean;
  requiresUpgrade?: boolean;
  member?: TeamMember;
}

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: "mem-001",
    organizationId: "org-001",
    fullName: "Roberto Silva",
    email: "roberto.silva@autoprime.com.br",
    phone: "+5547999881100",
    role: "admin",
    status: "active",
    createdAt: new Date(Date.now() - 60 * 86_400_000).toISOString(),
  },
  {
    id: "mem-002",
    organizationId: "org-001",
    fullName: "Juliana Costa",
    email: "juliana.costa@autoprime.com.br",
    phone: "+5547999882200",
    role: "gerente",
    status: "active",
    createdAt: new Date(Date.now() - 30 * 86_400_000).toISOString(),
  },
  {
    id: "mem-003",
    organizationId: "org-001",
    fullName: "Rafael Alves",
    email: "rafael.alves@autoprime.com.br",
    phone: "+5547999883300",
    role: "vendedor",
    status: "active",
    createdAt: new Date(Date.now() - 15 * 86_400_000).toISOString(),
  },
];

import { CANONICAL_PLANS, isSalesRole, SALES_ROLE_ALIASES, type SalesRoleAlias } from "@/config/plans";

export { isSalesRole, SALES_ROLE_ALIASES, type SalesRoleAlias };

/**
 * Calcula a capacidade total efetiva de vendedores permitidos na organização:
 * Capacidade Efetiva = Limite Base do Plano + Assentos Adicionais Contratados
 * Retorna null caso a organização possua capacidade ilimitada.
 */
export function calculateEffectiveSellerLimit(org?: OrgCapacityInput | null): number | null {
  if (!org) {
    return CANONICAL_PLANS.starter.sellerLimit;
  }

  // 1. Enterprise com flag de ilimitado
  if (org.enterprise_unlimited || org.unlimited_sellers) {
    return null;
  }

  const extra = Math.max(0, org.extra_sellers_count ?? 0);
  const plan = (org.plan || "starter").toLowerCase();

  // 2. Enterprise com cota contratual personalizada
  if (plan === "enterprise") {
    if (org.max_sellers === null || org.max_sellers === undefined) {
      return null; // fallback para ilimitado se enterprise não tiver teto explícito
    }
    return Math.max(0, org.max_sellers) + extra;
  }

  // 3. Planos Canônicos Padrão (Starter = 3, Pro = 8)
  const baseLimit = CANONICAL_PLANS[plan as keyof typeof CANONICAL_PLANS]?.sellerLimit ?? 3;
  return baseLimit + extra;
}

export const INITIAL_CAPACITY: TeamCapacity = {
  baseLimit: CANONICAL_PLANS.starter.sellerLimit,
  extraSellersCount: 0,
  effectiveLimit: CANONICAL_PLANS.starter.sellerLimit,
  currentSalesCount: 1, // Apenas Rafael Alves é vendedor nos INITIAL_TEAM_MEMBERS
  exemptMembersCount: 2, // Roberto Silva (admin) e Juliana Costa (gerente)
  remainingSlots: (CANONICAL_PLANS.starter.sellerLimit ?? 3) - 1,
  isLimitReached: false,
  canAddExtra: true,
  currentCount: 1,
  maxSellers: CANONICAL_PLANS.starter.sellerLimit,
  plan: "starter",
  planName: CANONICAL_PLANS.starter.name,
  hasAvailableSlots: true,
};
