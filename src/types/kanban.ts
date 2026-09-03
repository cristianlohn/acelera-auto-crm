/**
 * @file kanban.ts
 * @description Tipagens completas para o Funil de Vendas e Quadro Kanban interativo de Leads.
 */

export type LeadStage =
  | "new"
  | "in_contact"
  | "test_drive"
  | "proposal"
  | "won"
  | "lost"
  | "visit_scheduled"
  | "proposal_fi";

export interface KanbanLeadSeller {
  id: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  avatar?: string;
}

export interface KanbanLead {
  id: string;
  organization_id: string;
  name: string;
  phone: string;
  email?: string;
  source: "meta_ads" | "webmotors" | "icarros" | "olx" | "site" | "other" | string;
  vehicle_of_interest: string;
  assigned_to: KanbanLeadSeller | null;
  assigned_to_name: string;
  stage: LeadStage;
  sla_minutes: number;
  sla_minutes_elapsed: number;
  created_at: string;
  updated_at: string;
  stage_changed_at?: string;
  value?: number;
  estimated_value?: number;
  vehicle_id?: string;
  vehicle_name?: string;
  lost_reason?: string;
  segment?: "new_cars" | "used_cars" | "f_and_i" | "all";
  notes?: string;
  short_code?: string;
}

export interface KanbanColumnConfig {
  id: LeadStage;
  title: string;
  shortTitle: string;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeColor: string;
  dotColor: string;
  leads: KanbanLead[];
  totalValue: number;
}

export interface KanbanFilterState {
  search: string;
  sellerId: string;
  segment: "all" | "new_cars" | "used_cars" | "f_and_i";
  source?: string;
}

export interface KanbanBoardData {
  columns: KanbanColumnConfig[];
  totalLeadsCount: number;
  totalPipelineValue: number;
  wonLeadsCount: number;
  conversionRate: number;
}

export const KANBAN_STAGES_CONFIG: Omit<KanbanColumnConfig, "leads" | "totalValue">[] = [
  {
    id: "new",
    title: "Novos Leads",
    shortTitle: "Novos",
    color: "text-blue-400",
    bgColor: "bg-blue-950/20",
    borderColor: "border-blue-500/30",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    dotColor: "bg-blue-500",
  },
  {
    id: "in_contact",
    title: "Primeiro Contato",
    shortTitle: "Contato",
    color: "text-cyan-400",
    bgColor: "bg-cyan-950/20",
    borderColor: "border-cyan-500/30",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    dotColor: "bg-cyan-500",
  },
  {
    id: "test_drive",
    title: "Visita / Test Drive",
    shortTitle: "Test Drive",
    color: "text-orange-400",
    bgColor: "bg-orange-950/20",
    borderColor: "border-orange-500/30",
    badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    dotColor: "bg-orange-500",
  },
  {
    id: "proposal",
    title: "Proposta & F&I",
    shortTitle: "Proposta",
    color: "text-purple-400",
    bgColor: "bg-purple-950/20",
    borderColor: "border-purple-500/30",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    dotColor: "bg-purple-500",
  },
  {
    id: "won",
    title: "Venda Fechada",
    shortTitle: "Ganha",
    color: "text-emerald-400",
    bgColor: "bg-emerald-950/20",
    borderColor: "border-emerald-500/30",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dotColor: "bg-emerald-500",
  },
  {
    id: "lost",
    title: "Descarte / Perdido",
    shortTitle: "Perdido",
    color: "text-red-400",
    bgColor: "bg-red-950/20",
    borderColor: "border-red-500/30",
    badgeColor: "bg-red-500/10 text-red-400 border-red-500/20",
    dotColor: "bg-red-500",
  },
];
