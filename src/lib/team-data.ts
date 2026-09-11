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

export interface TeamCapacity {
  currentCount: number;
  maxSellers: number | null;
  plan: "starter" | "pro" | "enterprise";
  planName: string;
  hasAvailableSlots?: boolean;
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

export const INITIAL_CAPACITY: TeamCapacity = {
  currentCount: 1, // Apenas Rafael Alves é vendedor nos INITIAL_TEAM_MEMBERS
  maxSellers: CANONICAL_PLANS.starter.sellerLimit,
  plan: "starter",
  planName: CANONICAL_PLANS.starter.name,
  hasAvailableSlots: true,
};
