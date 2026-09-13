/**
 * @file funnel-metrics.ts
 * @description Função pura de cálculo e normalização de métricas do funil de vendas.
 * 
 * Estrutura canônica:
 * - currentLeadsCount: leads parados nesta etapa hoje
 * - reachedLeadsCount: leads que passaram ou estão nesta etapa
 * - totalLeads: denominador geral de oportunidades
 * - percentage: ((reachedLeadsCount / totalLeads) * 100)
 */

import { normalizeLeadStage, type CanonicalStage } from "./normalize-stage";

export interface StageMetric {
  stage: string;
  label: string;
  currentLeadsCount: number; // leads parados nesta etapa hoje
  reachedLeadsCount: number; // leads que passaram ou estão nesta etapa
  totalLeads: number; // denominador geral de oportunidades
  percentage: number; // ((reachedLeadsCount / totalLeads) * 100)
}

export interface StageDefinition {
  stage: CanonicalStage | string;
  label: string;
}

export const CANONICAL_FUNNEL_STAGES: StageDefinition[] = [
  { stage: "new", label: "Novos Leads" },
  { stage: "first_contact", label: "Primeiro Contato" },
  { stage: "visit", label: "Visita / Test Drive" },
  { stage: "proposal", label: "Proposta & F&I" },
  { stage: "won", label: "Venda Concluída" },
  { stage: "lost", label: "Perdido" },
];

export interface RawStageInput {
  stage: string;
  status?: string;
  label?: string;
  currentLeadsCount?: number;
  reachedLeadsCount?: number;
  totalLeads?: number;
}

/**
 * Calcula a porcentagem do funil com precisão decimal ((reached / total) * 100).
 */
export function calculateFunnelPercentage(reachedLeadsCount: number, totalLeads: number): number {
  if (!totalLeads || totalLeads <= 0) return 0;
  return Number(((reachedLeadsCount / totalLeads) * 100).toFixed(1));
}

/**
 * Função pura de cálculo de métricas de estágio do funil comercial.
 *
 * Suporta dois modos de invocação:
 * 1. Lista de leads brutos (com status/stage): agrega automaticamene current e reached por etapa canônica.
 * 2. Lista de estágios pré-computados (com reachedLeadsCount / currentLeadsCount): recalcula os percentuais rigorosos baseados em totalLeads.
 */
export function calculateStageFunnelMetrics(
  items: Array<Record<string, unknown> | RawStageInput>,
  customTotalLeads?: number
): StageMetric[] {
  if (!items || items.length === 0) {
    const total = customTotalLeads ?? 0;
    return CANONICAL_FUNNEL_STAGES.map((s) => ({
      stage: s.stage,
      label: s.label,
      currentLeadsCount: 0,
      reachedLeadsCount: 0,
      totalLeads: total,
      percentage: 0,
    }));
  }

  // Verifica se o primeiro item é uma estrutura pré-agregada (contém reachedLeadsCount ou currentLeadsCount)
  const isPreAggregated =
    "reachedLeadsCount" in items[0] ||
    ("stage" in items[0] && typeof items[0].stage === "string" && ("currentLeadsCount" in items[0] || "totalLeads" in items[0]));

  if (isPreAggregated) {
    const preList = items as RawStageInput[];
    const inferredTotal =
      customTotalLeads ??
      preList.find((p) => typeof p.totalLeads === "number" && p.totalLeads > 0)?.totalLeads ??
      Math.max(
        ...preList.map((p) => p.reachedLeadsCount ?? 0),
        preList.reduce((sum, p) => sum + (p.currentLeadsCount ?? 0), 0),
        1
      );

    return preList.map((st) => {
      const reached = st.reachedLeadsCount ?? 0;
      const current = st.currentLeadsCount ?? 0;
      const total = st.totalLeads ?? inferredTotal;
      const percentage = calculateFunnelPercentage(reached, total);
      const canonical = CANONICAL_FUNNEL_STAGES.find((c) => c.stage === st.stage);

      return {
        stage: st.stage,
        label: st.label || canonical?.label || st.stage,
        currentLeadsCount: current,
        reachedLeadsCount: reached,
        totalLeads: total,
        percentage,
      };
    });
  }

  // Modo Lista de Leads Brutos
  const totalLeads = customTotalLeads ?? items.length;

  const currentCounts: Record<CanonicalStage, number> = {
    new: 0,
    first_contact: 0,
    visit: 0,
    proposal: 0,
    won: 0,
    lost: 0,
  };

  for (const item of items) {
    const rawStatus = (item.status as string) || (item.stage as string);
    const stage = normalizeLeadStage(rawStatus);
    currentCounts[stage] = (currentCounts[stage] || 0) + 1;
  }

  // No pipeline comercial de veículos:
  // - Venda Concluída: alcançado por leads em 'won'
  // - Proposta & F&I: alcançado por 'proposal' e 'won'
  // - Visita / Test Drive: alcançado por 'visit', 'proposal' e 'won'
  // - Primeiro Contato: alcançado por 'first_contact', 'visit', 'proposal' e 'won' (e 'lost' se houve atendimento)
  // - Novos Leads: todos os leads da coorte (totalLeads)
  // - Perdido: leads em 'lost'
  const reachedWon = currentCounts.won;
  const reachedProposal = currentCounts.proposal + reachedWon;
  const reachedVisit = currentCounts.visit + reachedProposal;
  const reachedFirstContact = currentCounts.first_contact + reachedVisit;
  const reachedNew = totalLeads;
  const reachedLost = currentCounts.lost;

  const reachedMap: Record<CanonicalStage, number> = {
    new: reachedNew,
    first_contact: Math.min(totalLeads, reachedFirstContact),
    visit: reachedVisit,
    proposal: reachedProposal,
    won: reachedWon,
    lost: reachedLost,
  };

  return CANONICAL_FUNNEL_STAGES.map((def) => {
    const stage = def.stage as CanonicalStage;
    const reached = reachedMap[stage] ?? 0;
    const current = currentCounts[stage] ?? 0;
    const percentage = calculateFunnelPercentage(reached, totalLeads);

    return {
      stage: def.stage,
      label: def.label,
      currentLeadsCount: current,
      reachedLeadsCount: reached,
      totalLeads,
      percentage,
    };
  });
}
