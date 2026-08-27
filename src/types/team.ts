/**
 * @file team.ts
 * @description Tipagens completas para o módulo de Gestão de Equipe, Vendedores e Roleta Comercial.
 */

export type TeamRole = "seller" | "sdr" | "manager";

export type TeamSegment = "new_cars" | "used_cars" | "f_and_i" | "all";

export type TeamMemberStatus = "active" | "paused" | "vacation";

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
