/**
 * @file team.ts
 * @description Tipagens canônicas completas para o módulo de Gestão de Equipe, Vendedores e Roleta Comercial.
 */

/**
 * Papéis Canônicos: 'admin' | 'gerente' | 'vendedor'
 * Mantém uniões resilientes para compatibilidade com dados externos/legados.
 */
export type CanonicalTeamRole = "admin" | "gerente" | "vendedor";
export type TeamRole = CanonicalTeamRole | "seller" | "manager" | "sdr" | "vendedora";

export type TeamSegment = "new_cars" | "used_cars" | "f_and_i" | "all";

/**
 * Status Canônicos de Membros: 'ativo' | 'pausado' | 'inativo'
 * Mantém uniões resilientes para compatibilidade com dados externos/legados.
 */
export type CanonicalTeamMemberStatus = "ativo" | "pausado" | "inativo";
export type TeamMemberStatus =
  | CanonicalTeamMemberStatus
  | "active"
  | "paused"
  | "vacation"
  | "pending";

/**
 * Mapeador canônico para papéis de equipe.
 */
export function normalizeTeamRole(role?: string | null): CanonicalTeamRole {
  if (!role) return "vendedor";
  const r = role.toLowerCase().trim();
  if (r === "admin" || r === "diretor" || r === "owner" || r === "proprietario") return "admin";
  if (r === "gerente" || r === "manager") return "gerente";
  return "vendedor";
}

/**
 * Mapeador canônico para status de membros da equipe.
 */
export function normalizeTeamMemberStatus(status?: string | null): CanonicalTeamMemberStatus {
  if (!status) return "ativo";
  const s = status.toLowerCase().trim();
  if (s === "ativo" || s === "active") return "ativo";
  if (s === "pausado" || s === "paused") return "pausado";
  return "inativo";
}

export interface TeamMember {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  phone: string;
  role: TeamRole;
  segment: TeamSegment;
  in_roulette: boolean;
  status: TeamMemberStatus;
  monthly_goal_units: number;
  current_sales_units: number;
  avg_sla_minutes: number;
  sla_sample_count?: number;
  attended_leads_count?: number;
  created_at: string;
}

export interface TeamSummaryMetrics {
  totalMembers: number;
  activeInRoulette: number;
  totalMonthlyGoal: number;
  totalCurrentSales: number;
  teamAvgSlaMinutes: number;
  goalCompletionPercentage: number;
}
