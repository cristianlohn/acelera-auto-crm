/**
 * @file analytics.ts
 * @description Motor de agregação e métricas analíticas para o Cockpit do Gestor ("Dinheiro na Mesa" e SLA de Atendimento).
 */

export interface SellerPerformanceMetric {
  sellerName: string;
  leadsCount: number;
  activeDeals: number;
  wonDeals: number;
  avgResponseMinutes: number;
  slaBadge: "verde" | "amarelo" | "vermelho";
  sharePercentage: number;
  pipelineValue?: number;
  revenue?: number;
}

export interface BottleneckStats {
  withoutReturnCount: number;
  proposalsWithoutFollowupCount: number;
  pendingFinancingCount: number;
  hotLeadsCount: number;
}

export interface CockpitActionItem {
  id: string;
  sellerName: string;
  avatar: string;
  actionText: string;
  leadCount: number;
  urgencyType: "danger" | "warning" | "hot";
  timeText: string;
  defaultMessage: string;
  phone: string;
}

export const DEFAULT_RECOMMENDED_ACTIONS: CockpitActionItem[] = [
  {
    id: "act-1",
    sellerName: "Rafael Alves",
    avatar: "RA",
    actionText:
      "Lead João Ferreira aguardando primeiro contato há 22 min (Origem: Webmotors - Jeep Compass Longitude 2023)",
    leadCount: 1,
    urgencyType: "danger",
    timeText: "Há 22 min",
    defaultMessage:
      "Olá Rafael, o lead João Ferreira (Webmotors - Jeep Compass Longitude 2023) está aguardando primeiro contato há 22 minutos. Vamos priorizar o retorno agora para não esfriar!",
    phone: "5511988887777",
  },
  {
    id: "act-2",
    sellerName: "Lucas Mendes",
    avatar: "LM",
    actionText:
      "Ficha bancária aprovada no Banco BV para Mariana Albuquerque (Toyota Corolla Cross) sem envio de contrato há 18h",
    leadCount: 1,
    urgencyType: "warning",
    timeText: "Há 18h",
    defaultMessage:
      "Oi Lucas, a ficha da Mariana Albuquerque foi aprovada no Banco BV para o Corolla Cross há 18h. Favor enviar o contrato para formalização ainda hoje!",
    phone: "5511977776666",
  },
  {
    id: "act-3",
    sellerName: "Camila Rocha",
    avatar: "CR",
    actionText:
      "Visita de Test-Drive concluída ontem com Carlos Eduardo (VW Nivus) sem registro de proposta",
    leadCount: 1,
    urgencyType: "warning",
    timeText: "Ontem",
    defaultMessage:
      "Olá Camila! O test-drive do Carlos Eduardo (VW Nivus) foi concluído ontem e ainda não há proposta registrada no funil. Faça um follow-up com ele hoje!",
    phone: "5511966665555",
  },
];

export interface ManagerCockpitMetrics {
  totalPipelineValue: number;
  valueAtRisk: number;
  totalActiveLeads: number;
  totalLeads: number;
  averageFirstContactMinutes: number;
  slaComplianceRate: number;
  overdueLeadsCount: number;
  wonLeadsCount: number;
  conversionRate: number;
  sellerRanking: SellerPerformanceMetric[];
  bottlenecks?: BottleneckStats;
  recommendedActions?: CockpitActionItem[];
}

export interface LeadAnalyticsInput {
  id?: string;
  name?: string;
  phone?: string;
  status: string;
  stage?: string;
  seller_name?: string;
  sellerName?: string;
  vehicle_interest?: string;
  vehicleInterest?: string;
  estimated_value?: number;
  estimatedValue?: number;
  value?: number;
  price?: number;
  created_at?: string;
  createdAt?: string;
  first_contact_at?: string | null;
  firstContactAt?: string | null;
  last_contact_at?: string | null;
  lastContactAt?: string | null;
  organization_id?: string;
  organizationId?: string;
  notes?: string;
  proposalFi?: boolean;
  isFinancing?: boolean;
}

/**
 * Retorna o valor monetário estrito do lead. Se o lead não possui valor explícito nem preço associado, retorna 0 (ou defaultTicket).
 */
export function estimateLeadVehicleValue(lead: LeadAnalyticsInput, defaultTicket = 0): number {
  if (typeof lead.estimatedValue === "number" && !isNaN(lead.estimatedValue)) return Math.max(0, lead.estimatedValue);
  if (typeof lead.estimated_value === "number" && !isNaN(lead.estimated_value)) return Math.max(0, lead.estimated_value);
  if (typeof lead.value === "number" && !isNaN(lead.value)) return Math.max(0, lead.value);
  if (typeof lead.price === "number" && !isNaN(lead.price)) return Math.max(0, lead.price);

  const customFields = (lead as unknown as Record<string, unknown>).custom_fields as Record<string, unknown> | undefined;
  if (customFields && typeof customFields === "object") {
    if (typeof customFields.estimated_value === "number" && !isNaN(customFields.estimated_value)) return Math.max(0, customFields.estimated_value);
    if (typeof customFields.value === "number" && !isNaN(customFields.value)) return Math.max(0, customFields.value);
    if (typeof customFields.price === "number" && !isNaN(customFields.price)) return Math.max(0, customFields.price);
  }

  const rawVal = lead.estimated_value ?? lead.estimatedValue ?? lead.value ?? lead.price ?? defaultTicket;
  const num = Number(rawVal);
  return isNaN(num) ? 0 : Math.max(0, num);
}

/**
 * Calcula a soma monetária estrita dos leads em etapas ativas no Pipeline (desconsiderando won e lost).
 */
export function calculatePipelineTotal(leads: Array<LeadAnalyticsInput | Record<string, unknown>>): number {
  return leads
    .filter((l) => {
      const stage = (((l as LeadAnalyticsInput).stage || (l as LeadAnalyticsInput).status || "") as string).toLowerCase();
      return (
        stage !== "won" &&
        stage !== "lost" &&
        stage !== "fechado" &&
        stage !== "ganho" &&
        stage !== "perdido" &&
        stage !== "vendido"
      );
    })
    .reduce((acc, lead) => {
      const rawVal =
        (lead as LeadAnalyticsInput).estimated_value ??
        (lead as LeadAnalyticsInput).estimatedValue ??
        (lead as LeadAnalyticsInput).value ??
        (lead as LeadAnalyticsInput).price ??
        0;
      const val = Number(rawVal);
      return acc + (isNaN(val) ? 0 : Math.max(0, val));
    }, 0);
}

/**
 * Calcula o valor monetário estrito em risco de leads com SLA estourado.
 */
export function calculateRiskPipeline(breachedLeads: Array<LeadAnalyticsInput | Record<string, unknown>>): number {
  return breachedLeads.reduce((acc, lead) => {
    const rawVal =
      (lead as LeadAnalyticsInput).estimated_value ??
      (lead as LeadAnalyticsInput).estimatedValue ??
      (lead as LeadAnalyticsInput).value ??
      (lead as LeadAnalyticsInput).price ??
      0;
    const val = Number(rawVal);
    return acc + (isNaN(val) ? 0 : Math.max(0, val));
  }, 0);
}

const ACTIVE_STATUSES = new Set([
  "novo",
  "atendimento",
  "visita",
  "proposta",
  "contato_feito",
  "visita_agendada",
  "proposta_enviada",
  "em_negociacao",
  "proposal",
  "proposal_fi",
  "in_contact",
  "test_drive",
  "visit_scheduled",
]);

const WON_STATUSES = new Set(["fechado", "ganho", "vendido", "won"]);

/**
 * Função pura e determinística de cálculo de métricas executivas do Cockpit do Gestor.
 */
/**
 * Função utilitária pura para cálculo de SLA de Primeiro Atendimento (Tempo Real + Histórico).
 */
export function calculateCockpitMetrics(
  leads: LeadAnalyticsInput[],
  slaLimitMinutes = 15
) {
  const now = Date.now();

  let answeredCount = 0;
  let answeredOnTimeCount = 0;
  let totalResponseTimeMinutes = 0;

  let openBreachedCount = 0;
  let totalOpenWaitingTimeMinutes = 0;
  let openPendingCount = 0;

  leads.forEach((lead) => {
    const createdAtStr = lead.createdAt || lead.created_at;
    const createdAt = createdAtStr ? new Date(createdAtStr).getTime() : now;

    const contactStr =
      lead.firstContactAt ||
      lead.first_contact_at ||
      lead.lastContactAt ||
      lead.last_contact_at;

    if (contactStr) {
      answeredCount++;
      const responseMinutes = Math.max(
        0,
        Math.round((new Date(contactStr).getTime() - createdAt) / 60000)
      );
      totalResponseTimeMinutes += responseMinutes;
      if (responseMinutes <= slaLimitMinutes) {
        answeredOnTimeCount++;
      }
    } else {
      openPendingCount++;
      const waitingMinutes = Math.max(
        0,
        Math.round((now - createdAt) / 60000)
      );
      totalOpenWaitingTimeMinutes += waitingMinutes;
      if (waitingMinutes > slaLimitMinutes) {
        openBreachedCount++;
      }
    }
  });

  const totalEvaluated = answeredCount + openBreachedCount;
  const slaPercentage =
    totalEvaluated > 0
      ? Math.round((answeredOnTimeCount / totalEvaluated) * 100)
      : 100;

  const averageResponseMinutes =
    answeredCount > 0
      ? Math.round(totalResponseTimeMinutes / answeredCount)
      : openPendingCount > 0
      ? Math.round(totalOpenWaitingTimeMinutes / openPendingCount)
      : 0;

  return {
    slaPercentage,
    averageResponseMinutes,
    unansweredLeadsCount: openBreachedCount,
  };
}

/**
 * Função pura e determinística de cálculo de métricas executivas do Cockpit do Gestor.
 */
export function calculateManagerCockpitMetrics(
  leads: LeadAnalyticsInput[],
  options?: {
    now?: Date;
    defaultTicket?: number;
    recommendedActions?: CockpitActionItem[];
    isDemo?: boolean;
    cycleTotalLeads?: number;
    slaLimitMinutes?: number;
  }
): ManagerCockpitMetrics {
  const now = options?.now || new Date();
  const nowTime = now.getTime();
  const slaLimit = options?.slaLimitMinutes ?? 15;

  let totalPipelineValue = 0;
  let valueAtRisk = 0;
  let totalActiveLeads = 0;
  let wonLeadsCount = 0;
  let overdueLeadsCount = 0;

  let withoutReturnCount = 0;
  let proposalsWithoutFollowupCount = 0;
  let pendingFinancingCount = 0;
  let hotLeadsCount = 0;

  let answeredCount = 0;
  let answeredOnTimeCount = 0;
  const contactResponseTimes: number[] = [];

  let openBreachedCount = 0;
  let openPendingCount = 0;
  const openWaitingTimes: number[] = [];

  const sellerGroups: Record<
    string,
    {
      leadsCount: number;
      activeDeals: number;
      wonDeals: number;
      responseTimes: number[];
      waitingTimes: number[];
      pipelineValue: number;
      revenue: number;
    }
  > = {};

  for (const lead of leads) {
    const rawStatus = (lead.status || "novo").toLowerCase();
    const isActive = ACTIVE_STATUSES.has(rawStatus);
    const isWon = WON_STATUSES.has(rawStatus);
    const val = estimateLeadVehicleValue(lead, options?.defaultTicket ?? 0);

    const seller =
      lead.sellerName?.trim() ||
      lead.seller_name?.trim() ||
      "Vendedor Não Atribuído";

    if (!sellerGroups[seller]) {
      sellerGroups[seller] = {
        leadsCount: 0,
        activeDeals: 0,
        wonDeals: 0,
        responseTimes: [],
        waitingTimes: [],
        pipelineValue: 0,
        revenue: 0,
      };
    }
    sellerGroups[seller].leadsCount++;

    if (isActive) {
      totalActiveLeads++;
      totalPipelineValue += val;
      sellerGroups[seller].activeDeals++;
      sellerGroups[seller].pipelineValue += val;
    }

    if (isWon) {
      wonLeadsCount++;
      sellerGroups[seller].wonDeals++;
      sellerGroups[seller].revenue += val;
    }

    // SLA & Risco
    const createdAtStr = lead.createdAt || lead.created_at;
    const createdAtTime = createdAtStr ? new Date(createdAtStr).getTime() : nowTime;
    const contactStr =
      lead.firstContactAt ||
      lead.first_contact_at ||
      lead.lastContactAt ||
      lead.last_contact_at;
    const hasContact = Boolean(contactStr);

    if (hasContact && contactStr) {
      answeredCount++;
      const contactTime = new Date(contactStr).getTime();
      const diffMinutes = Math.max(0, (contactTime - createdAtTime) / 60000);
      contactResponseTimes.push(diffMinutes);
      sellerGroups[seller].responseTimes.push(diffMinutes);

      if (diffMinutes <= slaLimit) {
        answeredOnTimeCount++;
      }

      // Se está em etapa ativa mas sem contato há mais de 48 horas
      if (isActive) {
        const lastContactTime = lead.lastContactAt || lead.last_contact_at
          ? new Date(lead.lastContactAt || lead.last_contact_at!).getTime()
          : contactTime;
        const hoursSinceLastContact = (nowTime - lastContactTime) / 3600000;
        if (hoursSinceLastContact > 48) {
          valueAtRisk += val;
        }
      }
    } else {
      // Lead em aberto (sem primeiro contato)
      openPendingCount++;
      const waitingMinutes = Math.max(0, (nowTime - createdAtTime) / 60000);
      openWaitingTimes.push(waitingMinutes);
      sellerGroups[seller].waitingTimes.push(waitingMinutes);

      if (waitingMinutes > slaLimit) {
        openBreachedCount++;
        overdueLeadsCount++;
        withoutReturnCount++;
        valueAtRisk += val;
      }
    }

    // Indicadores de Gargalo adicionais
    if (
      (rawStatus === "proposta" || rawStatus === "proposal" || rawStatus === "proposta_enviada") &&
      (!contactStr || (nowTime - new Date(contactStr).getTime()) > 24 * 3600000)
    ) {
      proposalsWithoutFollowupCount++;
    }

    const isFinancing =
      rawStatus === "proposta_fi" ||
      rawStatus === "f_and_i" ||
      rawStatus === "financing" ||
      (lead as unknown as Record<string, unknown>).stage === "financing" ||
      (lead as unknown as Record<string, unknown>).stage === "proposta_fi" ||
      Boolean(lead.proposalFi) ||
      Boolean(lead.isFinancing);

    if (isFinancing && isActive) {
      pendingFinancingCount++;
    }

    const isHotStage =
      rawStatus === "atendimento" ||
      rawStatus === "in_contact" ||
      rawStatus === "visita" ||
      rawStatus === "visit_scheduled" ||
      rawStatus === "test_drive" ||
      rawStatus === "proposta" ||
      rawStatus === "proposal";

    if (isHotStage && isActive) {
      if (!contactStr) {
        hotLeadsCount++;
      } else {
        const lastActionTime = new Date(contactStr).getTime();
        const hoursWithoutAction = (nowTime - lastActionTime) / 3600000;
        if (hoursWithoutAction >= 24) {
          hotLeadsCount++;
        }
      }
    }
  }

  const totalEvaluatedForSLA = answeredCount + openBreachedCount;
  const slaComplianceRate =
    totalEvaluatedForSLA > 0
      ? Number(((answeredOnTimeCount / totalEvaluatedForSLA) * 100).toFixed(1))
      : 100;

  const averageFirstContactMinutes =
    answeredCount > 0
      ? Number(
          (
            contactResponseTimes.reduce((a, b) => a + b, 0) / answeredCount
          ).toFixed(1)
        )
      : openPendingCount > 0
      ? Number(
          (
            openWaitingTimes.reduce((a, b) => a + b, 0) / openPendingCount
          ).toFixed(1)
        )
      : 0;

  const totalLeads = leads.length;
  const conversionRate =
    totalLeads > 0
      ? Number(((wonLeadsCount / totalLeads) * 100).toFixed(1))
      : 0;

  // Ranking de Vendedores
  const sellerRanking: SellerPerformanceMetric[] = Object.entries(sellerGroups).map(
    ([sellerName, data]) => {
      let avgResp = 0.0;
      if (data.responseTimes.length > 0) {
        avgResp = Number(
          (
            data.responseTimes.reduce((a, b) => a + b, 0) /
            data.responseTimes.length
          ).toFixed(1)
        );
      } else if (data.waitingTimes.length > 0) {
        avgResp = Number(
          (
            data.waitingTimes.reduce((a, b) => a + b, 0) /
            data.waitingTimes.length
          ).toFixed(1)
        );
      }

      let slaBadge: "verde" | "amarelo" | "vermelho" = "verde";
      if (avgResp > slaLimit) {
        slaBadge = "vermelho";
      } else if (avgResp >= 10) {
        slaBadge = "amarelo";
      }

      const sharePercentage =
        totalLeads > 0
          ? Number(((data.leadsCount / totalLeads) * 100).toFixed(1))
          : 0;

      return {
        sellerName,
        leadsCount: data.leadsCount,
        activeDeals: data.activeDeals,
        wonDeals: data.wonDeals,
        avgResponseMinutes: avgResp,
        slaBadge,
        sharePercentage,
        pipelineValue: data.pipelineValue,
        revenue: data.revenue,
      };
    }
  ).sort((a, b) => b.wonDeals - a.wonDeals || a.avgResponseMinutes - b.avgResponseMinutes);

  const recommendedActions =
    options?.recommendedActions ||
    (options?.isDemo || leads.some((l) => l.name?.includes("João Ferreira"))
      ? DEFAULT_RECOMMENDED_ACTIONS
      : undefined);

  return {
    totalPipelineValue,
    valueAtRisk,
    totalActiveLeads,
    totalLeads,
    averageFirstContactMinutes,
    slaComplianceRate,
    overdueLeadsCount,
    wonLeadsCount,
    conversionRate,
    sellerRanking,
    bottlenecks: {
      withoutReturnCount,
      proposalsWithoutFollowupCount,
      pendingFinancingCount,
      hotLeadsCount,
    },
    recommendedActions,
  };
}

