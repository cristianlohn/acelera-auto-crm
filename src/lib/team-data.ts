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
  maxSellers: number;
  plan: "starter" | "pro" | "enterprise";
  planName: string;
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
    fullName: "Rafael Martins",
    email: "rafael.martins@autoprime.com.br",
    phone: "+5547999883300",
    role: "vendedor",
    status: "active",
    createdAt: new Date(Date.now() - 15 * 86_400_000).toISOString(),
  },
  {
    id: "mem-004",
    organizationId: "org-001",
    fullName: "Amanda Souza",
    email: "amanda.souza@autoprime.com.br",
    phone: "+5547999884400",
    role: "vendedor",
    status: "active",
    createdAt: new Date(Date.now() - 15 * 86_400_000).toISOString(),
  },
  {
    id: "mem-005",
    organizationId: "org-001",
    fullName: "Lucas Ferreira",
    email: "lucas.ferreira@autoprime.com.br",
    phone: "+5547999885500",
    role: "vendedor",
    status: "active",
    createdAt: new Date(Date.now() - 15 * 86_400_000).toISOString(),
  },
];

import { CANONICAL_PLANS } from "@/config/plans";

export const INITIAL_CAPACITY: TeamCapacity = {
  currentCount: 3,
  maxSellers: CANONICAL_PLANS.starter.maxSellers,
  plan: "starter",
  planName: CANONICAL_PLANS.starter.name,
};
