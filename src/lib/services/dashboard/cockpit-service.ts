/**
 * @file cockpit-service.ts
 * @description Serviço Centralizado de Métricas, SLAs, Dinheiro em Risco e Motor de Recomendações do Cockpit do Gestor.
 */

import {
  calculateManagerCockpitMetrics,
  getRecommendedActions,
  estimateLeadVehicleValue,
  calculateRiskPipeline,
  type SystemRecommendation,
  type SellerPerformanceMetric,
  type BottleneckStats,
  type CockpitActionItem,
  type ManagerCockpitMetrics,
  type LeadAnalyticsInput,
  DEFAULT_RECOMMENDED_ACTIONS,
} from "@/lib/crm/analytics";
import { getManagerCockpitMetrics } from "@/app/actions/cockpit";

export type {
  SystemRecommendation,
  SellerPerformanceMetric,
  BottleneckStats,
  CockpitActionItem,
  ManagerCockpitMetrics,
  LeadAnalyticsInput,
};

export {
  calculateManagerCockpitMetrics,
  getRecommendedActions,
  estimateLeadVehicleValue,
  calculateRiskPipeline,
  getManagerCockpitMetrics,
  DEFAULT_RECOMMENDED_ACTIONS,
};

/**
 * Calcula o valor financeiro do pipeline em risco com base no tempo de SLA estourado.
 */
export function calculatePipelineAtRisk(
  leads: LeadAnalyticsInput[],
  options?: { now?: Date; slaLimitMinutes?: number; defaultTicket?: number }
): number {
  const metrics = calculateManagerCockpitMetrics(leads, options);
  return metrics.valueAtRisk;
}
