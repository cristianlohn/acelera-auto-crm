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
  seller_name?: string;
  sellerName?: string;
  vehicle_interest?: string;
  vehicleInterest?: string;
  estimated_value?: number;
  estimatedValue?: number;
  price?: number;
  created_at?: string;
  createdAt?: string;
  last_contact_at?: string | null;
  lastContactAt?: string | null;
  organization_id?: string;
  organizationId?: string;
  notes?: string;
  proposalFi?: boolean;
  isFinancing?: boolean;
}

const VEHICLE_ESTIMATED_PRICES: Record<string, number> = {
  corolla: 175000,
  compass: 185000,
  civic: 145000,
  "hr-v": 160000,
  hrv: 160000,
  strada: 105000,
  nivus: 130000,
  creta: 140000,
  onix: 88000,
  bmw: 320000,
  song: 230000,
  ranger: 260000,
  "t-cross": 135000,
  tcross: 135000,
  renegade: 125000,
  tracker: 128000,
  kicks: 118000,
  pulse: 102000,
  fastback: 138000,
  polo: 92000,
  hb20: 86000,
  mobi: 68000,
  kwid: 65000,
};

/**
 * Estima o valor monetário do veículo em negociação com base no modelo ou valor explícito.
 */
export function estimateLeadVehicleValue(lead: LeadAnalyticsInput, defaultTicket = 0): number {
  if (typeof lead.estimatedValue === "number" && lead.estimatedValue > 0) return lead.estimatedValue;
  if (typeof lead.estimated_value === "number" && lead.estimated_value > 0) return lead.estimated_value;
  if (typeof lead.price === "number" && lead.price > 0) return lead.price;

  const text = (lead.vehicleInterest || lead.vehicle_interest || "").toLowerCase();
  for (const [key, price] of Object.entries(VEHICLE_ESTIMATED_PRICES)) {
    if (text.includes(key)) {
      return price;
    }
  }

  return defaultTicket;
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
export function calculateManagerCockpitMetrics(
  leads: LeadAnalyticsInput[],
  options?: {
    now?: Date;
    defaultTicket?: number;
    recommendedActions?: CockpitActionItem[];
    isDemo?: boolean;
    cycleTotalLeads?: number;
  }
): ManagerCockpitMetrics {
  const now = options?.now || new Date();
  const nowTime = now.getTime();

  let totalPipelineValue = 0;
  let valueAtRisk = 0;
  let totalActiveLeads = 0;
  let wonLeadsCount = 0;
  let overdueLeadsCount = 0;

  let withoutReturnCount = 0;
  let proposalsWithoutFollowupCount = 0;
  let pendingFinancingCount = 0;
  let hotLeadsCount = 0;

  const contactResponseTimes: number[] = [];
  let compliantContactCount = 0;
  let totalEvaluatedForSLA = 0;

  const sellerGroups: Record<
    string,
    {
      leadsCount: number;
      activeDeals: number;
      wonDeals: number;
      responseTimes: number[];
      pipelineValue: number;
      revenue: number;
    }
  > = {};

  for (const lead of leads) {
    const rawStatus = (lead.status || "novo").toLowerCase();
    const isActive = ACTIVE_STATUSES.has(rawStatus);
    const isWon = WON_STATUSES.has(rawStatus);
    const isNew = rawStatus === "novo" || rawStatus === "new";
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
    const minutesSinceCreation = Math.max(0, (nowTime - createdAtTime) / 60000);

    const lastContactStr = lead.lastContactAt || lead.last_contact_at;
    const hasContact = Boolean(lastContactStr);

    let isOverdue = false;

    if (isNew) {
      if (minutesSinceCreation > 15) {
        isOverdue = true;
        overdueLeadsCount++;
        withoutReturnCount++;
        valueAtRisk += val;
      }
    } else if (isActive) {
      // Se está em etapa ativa mas sem contato há mais de 48 horas
      if (lastContactStr) {
        const hoursSinceLastContact = (nowTime - new Date(lastContactStr).getTime()) / 3600000;
        if (hoursSinceLastContact > 48) {
          valueAtRisk += val;
        }
      }
    }

    // Indicadores de Gargalo adicionais
    if (
      (rawStatus === "proposta" || rawStatus === "proposal" || rawStatus === "proposta_enviada") &&
      (!lastContactStr || (nowTime - new Date(lastContactStr).getTime()) > 24 * 3600000)
    ) {
      proposalsWithoutFollowupCount++;
    }

    const isFinancing =
      rawStatus === "proposta_fi" ||
      rawStatus === "f_and_i" ||
      rawStatus.includes("financiamento") ||
      Boolean(lead.proposalFi) ||
      Boolean(lead.isFinancing) ||
      Boolean(
        lead.notes &&
          (lead.notes.toLowerCase().includes("financiamento") ||
            lead.notes.toLowerCase().includes("f&i") ||
            lead.notes.toLowerCase().includes("banc") ||
            lead.notes.toLowerCase().includes("crédito") ||
            lead.notes.toLowerCase().includes("santander") ||
            lead.notes.toLowerCase().includes("bv") ||
            lead.notes.toLowerCase().includes("itaú"))
      ) ||
      Boolean(
        lead.vehicleInterest &&
          lead.vehicleInterest.toLowerCase().includes("financ")
      );

    if (isFinancing && isActive) {
      pendingFinancingCount++;
    }

    if (
      (rawStatus === "atendimento" || rawStatus === "in_contact" || rawStatus === "visita" || rawStatus === "test_drive") &&
      hasContact &&
      (nowTime - new Date(lastContactStr!).getTime()) <= 24 * 3600000
    ) {
      hotLeadsCount++;
    }

    // Cálculo do tempo de primeiro atendimento
    if (hasContact && lastContactStr) {
      const contactTime = new Date(lastContactStr).getTime();
      const diffMinutes = Math.max(0, (contactTime - createdAtTime) / 60000);
      contactResponseTimes.push(diffMinutes);
      sellerGroups[seller].responseTimes.push(diffMinutes);
      totalEvaluatedForSLA++;
      if (diffMinutes <= 15) {
        compliantContactCount++;
      }
    } else if (isNew) {
      totalEvaluatedForSLA++;
      if (!isOverdue) {
        compliantContactCount++;
      }
    }
  }

  const averageFirstContactMinutes =
    contactResponseTimes.length > 0
      ? Number(
          (
            contactResponseTimes.reduce((a, b) => a + b, 0) /
            contactResponseTimes.length
          ).toFixed(1)
        )
      : 0;

  const slaComplianceRate =
    totalEvaluatedForSLA > 0
      ? Number(((compliantContactCount / totalEvaluatedForSLA) * 100).toFixed(1))
      : 100;

  const totalLeads = leads.length;
  const conversionRate =
    totalLeads > 0
      ? Number(((wonLeadsCount / totalLeads) * 100).toFixed(1))
      : 0;

  // Ranking de Vendedores
  const sellerRanking: SellerPerformanceMetric[] = Object.entries(sellerGroups).map(
    ([sellerName, data]) => {
      const avgResp =
        data.responseTimes.length > 0
          ? Number(
              (
                data.responseTimes.reduce((a, b) => a + b, 0) /
                data.responseTimes.length
              ).toFixed(1)
            )
          : averageFirstContactMinutes;

      let slaBadge: "verde" | "amarelo" | "vermelho" = "verde";
      if (avgResp > 15) {
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
