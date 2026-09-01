/**
 * @file types.ts
 * @description Tipagens de domínio para o Módulo de Relatórios Executivos e Analytics.
 */

export type ReportPeriod = "7d" | "month" | "quarter" | "year";

export interface PeriodOption {
  id: ReportPeriod;
  label: string;
}

export interface KPIStats {
  revenue: number;
  revenueGrowth: number;
  conversionRate: number;
  conversionGrowth: number;
  averageTicket: number;
  ticketGrowth: number;
  avgResponseMinutes: number;
  responseDiffMinutes: number;
}

export interface FunnelStageData {
  id: string;
  name: string;
  count: number;
  percentage: number;
  conversionFromPrev: number;
}

export interface ChannelPerformance {
  channel: string;
  leadsCount: number;
  dealsCount: number;
  conversionRate: number;
  share: number;
  color: string;
}

export interface SellerPerformance {
  id: string;
  name: string;
  avatar: string;
  dealsCount: number;
  revenue: number;
  avgResponseMinutes: number;
  conversionRate: number;
}

export interface TopVehicle {
  make: string;
  model: string;
  version: string;
  unitsSold: number;
  totalRevenue: number;
  avgDaysToSell: number;
}

export interface ExecutiveReportData {
  kpis: KPIStats;
  funnel: FunnelStageData[];
  channels: ChannelPerformance[];
  sellers: SellerPerformance[];
  topVehicles: TopVehicle[];
}

export interface ReportFilterOptions {
  period?: ReportPeriod;
  from?: string;
  to?: string;
}
