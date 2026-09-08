/**
 * @file analytics.ts
 * @description Motor de agregação e métricas analíticas para o Cockpit do Gestor ("Dinheiro na Mesa" e SLA de Atendimento).
 */

export interface SystemRecommendation {
  id: string;
  type: "critical" | "warning" | "opportunity";
  title: string;
  description: string;
  count?: number;
  actionLabel: string;
  actionType: "reassign_roleta" | "notify_seller" | "filter_kanban" | "pause_seller";
  href?: string;
}

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

export const DEFAULT_RECOMMENDED_ACTIONS: CockpitActionItem[] = [];

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
  systemRecommendations?: SystemRecommendation[];
}

export interface LeadAnalyticsInput {
  id?: string;
  name?: string;
  phone?: string;
  status: string;
  stage?: string;
  seller_id?: string;
  sellerId?: string;
  seller_name?: string;
  sellerName?: string;
  seller_phone?: string;
  sellerPhone?: string;
  vehicle_interest?: string;
  vehicleInterest?: string;
  estimated_value?: number;
  estimatedValue?: number;
  value?: number;
  price?: number;
  vehicle_price?: number;
  vehiclePrice?: number;
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
  if (typeof lead.estimatedValue === "number" && !isNaN(lead.estimatedValue) && lead.estimatedValue > 0) return lead.estimatedValue;
  if (typeof lead.estimated_value === "number" && !isNaN(lead.estimated_value) && lead.estimated_value > 0) return lead.estimated_value;
  if (typeof lead.value === "number" && !isNaN(lead.value) && lead.value > 0) return lead.value;
  if (typeof lead.price === "number" && !isNaN(lead.price) && lead.price > 0) return lead.price;
  if (typeof lead.vehicle_price === "number" && !isNaN(lead.vehicle_price) && lead.vehicle_price > 0) return lead.vehicle_price;
  if (typeof lead.vehiclePrice === "number" && !isNaN(lead.vehiclePrice) && lead.vehiclePrice > 0) return lead.vehiclePrice;

  const customFields = (lead as unknown as Record<string, unknown>).custom_fields as Record<string, unknown> | undefined;
  if (customFields && typeof customFields === "object") {
    if (typeof customFields.estimated_value === "number" && !isNaN(customFields.estimated_value) && (customFields.estimated_value as number) > 0) return customFields.estimated_value as number;
    if (typeof customFields.value === "number" && !isNaN(customFields.value) && (customFields.value as number) > 0) return customFields.value as number;
    if (typeof customFields.price === "number" && !isNaN(customFields.price) && (customFields.price as number) > 0) return customFields.price as number;
    if (typeof customFields.vehicle_price === "number" && !isNaN(customFields.vehicle_price) && (customFields.vehicle_price as number) > 0) return customFields.vehicle_price as number;
    if (typeof customFields.vehiclePrice === "number" && !isNaN(customFields.vehiclePrice) && (customFields.vehiclePrice as number) > 0) return customFields.vehiclePrice as number;
  }

  const rawVal = lead.estimated_value ?? lead.estimatedValue ?? lead.value ?? lead.price ?? lead.vehicle_price ?? lead.vehiclePrice ?? defaultTicket;
  const num = Number(rawVal);
  return isNaN(num) ? 0 : Math.max(0, num);
}

/**
 * Gerador de recomendações operacionais dinâmicas baseado nas métricas reais da organização.
 */
export function getRecommendedActions({
  leadsWithoutContactCount,
  amountAtRisk,
  sellerRanking,
  hotLeadsWithoutActionTodayCount,
}: {
  leadsWithoutContactCount: number;
  amountAtRisk: number;
  sellerRanking: SellerPerformanceMetric[];
  hotLeadsWithoutActionTodayCount: number;
}): SystemRecommendation[] {
  const recommendations: SystemRecommendation[] = [];

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(val || 0);

  // 1. Alerta de SLA de Primeiro Contato estourado
  if (leadsWithoutContactCount > 0) {
    recommendations.push({
      id: "sla-breached",
      type: "critical",
      title: `${leadsWithoutContactCount} leads aguardando primeiro contato urgente`,
      description: `Leads ultrapassaram a meta de 15 min. Risco direto de perda de ${formatCurrency(amountAtRisk)}.`,
      count: leadsWithoutContactCount,
      actionLabel: "Reatribuir na Roleta",
      actionType: "reassign_roleta",
      href: "/dashboard/leads?filter=sla_breached",
    });
  }

  // 2. Vendedores com SLA Crítico (> 15 min)
  const criticalSellers = sellerRanking.filter(
    (s) => s.avgResponseMinutes > 15 && s.leadsCount > 0
  );
  if (criticalSellers.length > 0) {
    recommendations.push({
      id: "seller-sla-alert",
      type: "warning",
      title: `${criticalSellers.length} vendedor(es) com SLA crítico de resposta`,
      description: `Tempo médio acima de 15 min reduz drasticamente a taxa de conversão da revenda.`,
      count: criticalSellers.length,
      actionLabel: "Auditar Vendedores",
      actionType: "notify_seller",
      href: "/dashboard/team",
    });
  }

  // 3. Negociações quentes sem follow-up hoje
  if (hotLeadsWithoutActionTodayCount > 0) {
    recommendations.push({
      id: "hot-leads-followup",
      type: "opportunity",
      title: `${hotLeadsWithoutActionTodayCount} negociações quentes sem interação hoje`,
      description: `Clientes em estágios avançados (Visita/Proposta) sem contato registrado no dia.`,
      count: hotLeadsWithoutActionTodayCount,
      actionLabel: "Ver no Kanban",
      actionType: "filter_kanban",
      href: "/dashboard/leads?filter=hot_no_action",
    });
  }

  return recommendations;
}

/**
 * Gera ações prescritivas a partir dos leads reais e perfis da organização.
 * - Lead sem retorno (> 15 min na etapa 'novo'): card de cobrança via WhatsApp
 * - Proposta parada (> 24h sem follow-up): card de acompanhamento
 * - Se nenhum lead violar as regras: retorna []
 */
export function generatePrescriptiveActions(
  leads: LeadAnalyticsInput[],
  options?: {
    now?: Date;
    slaLimitMinutes?: number;
    sellerProfiles?: Array<{ id?: string; name?: string; phone?: string }>;
  }
): CockpitActionItem[] {
  const now = options?.now || new Date();
  const nowTime = now.getTime();
  const slaLimit = options?.slaLimitMinutes ?? 15;

  const actions: CockpitActionItem[] = [];

  // Mapeamento de perfis de vendedores para telefone
  const sellerPhoneMap = new Map<string, string>();
  if (options?.sellerProfiles) {
    for (const p of options.sellerProfiles) {
      if (p.name && p.phone) {
        sellerPhoneMap.set(p.name.trim().toLowerCase(), p.phone);
      }
      if (p.id && p.phone) {
        sellerPhoneMap.set(p.id, p.phone);
      }
    }
  }

  // 1. Agrupar leads 'novo' sem retorno (> slaLimit min) por vendedor
  const overdueNewLeadsBySeller: Record<string, LeadAnalyticsInput[]> = {};
  // 2. Agrupar propostas paradas (> 24h) por vendedor
  const stalledProposalsBySeller: Record<string, LeadAnalyticsInput[]> = {};

  for (const lead of leads) {
    const rawStatus = (lead.status || "novo").toLowerCase();
    const rawStage = (lead.stage || "").toLowerCase();

    const isNew =
      rawStatus === "novo" ||
      rawStatus === "new" ||
      rawStatus === "primeiro_contato" ||
      rawStage === "novo" ||
      rawStage === "new" ||
      rawStage === "primeiro_contato";

    const isProposal =
      rawStatus === "proposta" ||
      rawStatus === "proposal" ||
      rawStatus === "proposta_enviada" ||
      rawStage === "proposta" ||
      rawStage === "proposal" ||
      rawStage === "proposta_enviada";

    const createdAtStr = lead.createdAt || lead.created_at;
    const createdAtTime = createdAtStr ? new Date(createdAtStr).getTime() : nowTime;
    const firstContactStr = lead.firstContactAt || lead.first_contact_at;
    const lastContactStr = lead.lastContactAt || lead.last_contact_at;

    const sellerName = (
      lead.sellerName ||
      lead.seller_name ||
      "Vendedor Responsável"
    ).trim();

    // Lead sem retorno (> 15 min na etapa 'novo')
    if (isNew && !firstContactStr && !lastContactStr) {
      const waitingMinutes = (nowTime - createdAtTime) / 60000;
      if (waitingMinutes > slaLimit) {
        if (!overdueNewLeadsBySeller[sellerName]) {
          overdueNewLeadsBySeller[sellerName] = [];
        }
        overdueNewLeadsBySeller[sellerName].push(lead);
      }
    }

    // Proposta parada (> 24h sem follow-up)
    if (isProposal) {
      const lastActionTime = lastContactStr
        ? new Date(lastContactStr).getTime()
        : createdAtTime;
      const hoursSinceContact = (nowTime - lastActionTime) / 3600000;
      if (hoursSinceContact > 24) {
        if (!stalledProposalsBySeller[sellerName]) {
          stalledProposalsBySeller[sellerName] = [];
        }
        stalledProposalsBySeller[sellerName].push(lead);
      }
    }
  }

  // Gera ações para Leads sem retorno
  for (const [sellerName, sellerLeads] of Object.entries(overdueNewLeadsBySeller)) {
    const count = sellerLeads.length;
    const firstLead = sellerLeads[0];
    const firstLeadCreatedAt = firstLead.createdAt || firstLead.created_at;
    const oldestWaitMinutes = Math.round(
      (nowTime - (firstLeadCreatedAt ? new Date(firstLeadCreatedAt).getTime() : nowTime)) / 60000
    );

    const leadName = firstLead.name || "Cliente";
    const vehicle = firstLead.vehicleInterest || firstLead.vehicle_interest;
    const vehicleInfo = vehicle ? ` - ${vehicle}` : "";

    const initials =
      sellerName
        .split(" ")
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase() || "VD";

    const sellerFirstName = sellerName.split(" ")[0] || sellerName;

    const rawPhone =
      firstLead.sellerPhone ||
      firstLead.seller_phone ||
      sellerPhoneMap.get(sellerName.toLowerCase()) ||
      (firstLead.sellerId ? sellerPhoneMap.get(firstLead.sellerId) : "") ||
      (firstLead.seller_id ? sellerPhoneMap.get(firstLead.seller_id) : "") ||
      "";

    const digitsOnly = rawPhone.replace(/\D/g, "");
    const phone = digitsOnly.length > 0 ? (digitsOnly.startsWith("55") ? digitsOnly : `55${digitsOnly}`) : "";

    const timeText =
      oldestWaitMinutes >= 1440
        ? `Há ${Math.round(oldestWaitMinutes / 1440)} dias`
        : oldestWaitMinutes >= 60
        ? `Há ${Math.round(oldestWaitMinutes / 60)}h`
        : `Há ${oldestWaitMinutes} min`;

    const actionText =
      count === 1
        ? `Lead ${leadName} aguardando 1º contato (${timeText.toLowerCase()}${vehicleInfo})`
        : `${count} leads sem retorno imediato (> ${slaLimit} min)`;

    const defaultMessage =
      count === 1
        ? `Olá ${sellerFirstName}, identifiquei no Acelera que o lead ${leadName}${vehicleInfo} está aguardando primeiro contato ${timeText.toLowerCase()}. Vamos priorizar o retorno agora para não esfriar!`
        : `Olá ${sellerFirstName}, identifiquei no Acelera que você possui ${count} novos leads aguardando resposta há mais de ${slaLimit} minutos. Vamos priorizar o contato agora para não esfriar!`;

    actions.push({
      id: `act-new-${sellerName.replace(/\s+/g, "-").toLowerCase()}`,
      sellerName,
      avatar: initials,
      actionText,
      leadCount: count,
      urgencyType: "danger",
      timeText,
      defaultMessage,
      phone,
    });
  }

  // Gera ações para Propostas Paradas
  for (const [sellerName, sellerLeads] of Object.entries(stalledProposalsBySeller)) {
    const count = sellerLeads.length;
    const firstLead = sellerLeads[0];
    const lastAction = firstLead.lastContactAt || firstLead.last_contact_at || firstLead.createdAt || firstLead.created_at;
    const hoursSinceAction = Math.round(
      (nowTime - (lastAction ? new Date(lastAction).getTime() : nowTime)) / 3600000
    );

    const leadName = firstLead.name || "Cliente";
    const vehicle = firstLead.vehicleInterest || firstLead.vehicle_interest;
    const vehicleInfo = vehicle ? ` (${vehicle})` : "";

    const initials =
      sellerName
        .split(" ")
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase() || "VD";

    const sellerFirstName = sellerName.split(" ")[0] || sellerName;

    const rawPhone =
      firstLead.sellerPhone ||
      firstLead.seller_phone ||
      sellerPhoneMap.get(sellerName.toLowerCase()) ||
      (firstLead.sellerId ? sellerPhoneMap.get(firstLead.sellerId) : "") ||
      (firstLead.seller_id ? sellerPhoneMap.get(firstLead.seller_id) : "") ||
      "";

    const digitsOnly = rawPhone.replace(/\D/g, "");
    const phone = digitsOnly.length > 0 ? (digitsOnly.startsWith("55") ? digitsOnly : `55${digitsOnly}`) : "";

    const timeText =
      hoursSinceAction >= 48
        ? `Há ${Math.round(hoursSinceAction / 24)} dias`
        : `Há ${hoursSinceAction}h`;

    const actionText =
      count === 1
        ? `Proposta de ${leadName}${vehicleInfo} sem follow-up há ${hoursSinceAction}h`
        : `${count} propostas sem follow-up há mais de 24h`;

    const defaultMessage =
      count === 1
        ? `Oi ${sellerFirstName}, a proposta de ${leadName}${vehicleInfo} está há mais de 24h sem follow-up no funil. Consegue fazer um contato hoje para avançar no fechamento?`
        : `Oi ${sellerFirstName}, temos ${count} propostas de clientes com mais de 24h sem retorno no funil. Consegue fazer um follow-up com eles hoje?`;

    actions.push({
      id: `act-prop-${sellerName.replace(/\s+/g, "-").toLowerCase()}`,
      sellerName,
      avatar: initials,
      actionText,
      leadCount: count,
      urgencyType: "warning",
      timeText,
      defaultMessage,
      phone,
    });
  }

  return actions;
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
    systemRecommendations?: SystemRecommendation[];
    isDemo?: boolean;
    cycleTotalLeads?: number;
    slaLimitMinutes?: number;
    activeSellers?: string[];
    sellerProfiles?: Array<{ id?: string; name?: string; phone?: string }>;
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

  if (options?.activeSellers && options.activeSellers.length > 0) {
    for (const seller of options.activeSellers) {
      const trimmed = seller.trim();
      if (trimmed && !sellerGroups[trimmed]) {
        sellerGroups[trimmed] = {
          leadsCount: 0,
          activeDeals: 0,
          wonDeals: 0,
          responseTimes: [],
          waitingTimes: [],
          pipelineValue: 0,
          revenue: 0,
        };
      }
    }
  }

  for (const lead of leads) {
    const rawStatus = (lead.status || "novo").toLowerCase();
    const rawStage = (lead.stage || "").toLowerCase();
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
    const isNewStage =
      rawStatus === "novo" ||
      rawStatus === "new" ||
      rawStatus === "primeiro_contato" ||
      rawStage === "primeiro_contato" ||
      rawStage === "new" ||
      rawStage === "novo";

    const createdAtStr = lead.createdAt || lead.created_at;
    const createdAtTime = createdAtStr ? new Date(createdAtStr).getTime() : nowTime;
    const waitingMinutes = Math.max(0, (nowTime - createdAtTime) / 60000);

    const firstContactStr = lead.firstContactAt || lead.first_contact_at;
    const lastContactStr = lead.lastContactAt || lead.last_contact_at;
    const contactStr = firstContactStr || (isNewStage ? null : lastContactStr);
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
        const lastContactTime = lastContactStr
          ? new Date(lastContactStr).getTime()
          : contactTime;
        const hoursSinceLastContact = (nowTime - lastContactTime) / 3600000;
        if (hoursSinceLastContact > 48) {
          valueAtRisk += val;
        }
      }
    } else {
      // Lead em aberto (sem primeiro contato)
      openPendingCount++;
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
      (!lastContactStr || (nowTime - new Date(lastContactStr).getTime()) > 24 * 3600000)
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
      if (!lastContactStr) {
        hotLeadsCount++;
      } else {
        const lastActionTime = new Date(lastContactStr).getTime();
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

  const dynamicRecommendations = getRecommendedActions({
    leadsWithoutContactCount: withoutReturnCount,
    amountAtRisk: valueAtRisk,
    sellerRanking,
    hotLeadsWithoutActionTodayCount: hotLeadsCount,
  });

  const systemRecommendations =
    options?.systemRecommendations || dynamicRecommendations;

  const recommendedActions =
    options?.recommendedActions !== undefined
      ? options.recommendedActions
      : generatePrescriptiveActions(leads, {
          now,
          slaLimitMinutes: slaLimit,
          sellerProfiles: options?.sellerProfiles,
        });

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
    systemRecommendations,
  };
}

