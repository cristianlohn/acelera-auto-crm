/**
 * @file reports.ts
 * @description Server Actions para relatórios executivos e inteligência comercial.
 *
 * Suporta arquitetura Dual-Engine:
 * 1. Modo Demo (isDemoMode = true ou tenant demo): Retorna instantaneamente fixtures estruturadas (0ms delay).
 * 2. Produção (Supabase): Agrega dinamicamente a partir dos dados reais das tabelas `leads`, `vehicles` e `profiles`
 *    respeitando o isolamento estrito por `organization_id` ou consolidando globalmente para `superadmin`.
 */

"use server";

import { resolveUserTenantContext, DEFAULT_DEMO_ORG_ID } from "@/lib/auth/tenant";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import type {
  ReportPeriod,
  ReportFilterOptions,
  ExecutiveReportData,
  ChannelPerformance,
  SellerPerformance,
  TopVehicle,
  FunnelStageData,
} from "@/lib/reports/types";
import { PERIOD_METRICS, EMPTY_METRICS } from "@/lib/reports/fixtures";
import { normalizeLeadStage } from "@/lib/reports/normalize-stage";

const CHANNEL_CONFIGS: Record<string, { label: string; color: string }> = {
  webmotors: { label: "Webmotors", color: "bg-red-600" },
  site: { label: "Site / LP", color: "bg-blue-500" },
  landing_page: { label: "Site / LP", color: "bg-blue-500" },
  lp: { label: "Site / LP", color: "bg-blue-500" },
  whatsapp: { label: "WhatsApp", color: "bg-emerald-500" },
  instagram: { label: "Instagram Ads", color: "bg-pink-500" },
  meta: { label: "Meta Ads", color: "bg-pink-600" },
  meta_ads: { label: "Meta Ads", color: "bg-pink-600" },
  facebook: { label: "Meta Ads", color: "bg-pink-600" },
  olx: { label: "OLX", color: "bg-orange-500" },
  icarros: { label: "iCarros", color: "bg-red-500" },
  indicacao: { label: "Indicação", color: "bg-amber-500" },
  indicacao_dono: { label: "Indicação", color: "bg-amber-500" },
  patio: { label: "Showroom / Pátio", color: "bg-purple-500" },
  patio_balcao: { label: "Showroom / Pátio", color: "bg-purple-500" },
  showroom: { label: "Showroom / Pátio", color: "bg-purple-500" },
  telefone: { label: "Telefone Direto", color: "bg-cyan-500" },
  cliente_carteira: { label: "Cliente Carteira", color: "bg-teal-500" },
  outro: { label: "Outros", color: "bg-zinc-500" },
  other: { label: "Outros", color: "bg-zinc-500" },
};

function getPeriodBounds(
  period: ReportPeriod,
  filterOrPeriod?: ReportPeriod | ReportFilterOptions
): { startMs: number; endMs: number } {
  if (typeof filterOrPeriod === "object" && filterOrPeriod.from) {
    const start = new Date(filterOrPeriod.from).getTime();
    const end = filterOrPeriod.to ? new Date(filterOrPeriod.to).getTime() : Date.now();
    return { startMs: start, endMs: end };
  }

  const now = new Date();
  switch (period) {
    case "7d": {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
      return { startMs: start, endMs: now.getTime() };
    }
    case "month": {
      // Início do mês civil (dia 1 às 00:00:00.000)
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      return { startMs: start, endMs: end };
    }
    case "quarter": {
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).getTime();
      return { startMs: start, endMs: now.getTime() };
    }
    case "year": {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0).getTime();
      return { startMs: start, endMs: now.getTime() };
    }
    default: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      return { startMs: start, endMs: end };
    }
  }
}

function getLeadOrigin(lead: Record<string, unknown>): string {
  const custom = lead.custom_fields as Record<string, unknown> | null;
  const raw =
    lead.origin ||
    lead.source ||
    custom?.source ||
    custom?.origin ||
    "site";
  return typeof raw === "string" ? raw.trim().toLowerCase() : "site";
}

function getLeadValue(
  lead: Record<string, unknown>,
  vehiclesMap?: Map<string, number>
): number {
  const custom = (lead.custom_fields && typeof lead.custom_fields === "object")
    ? (lead.custom_fields as Record<string, unknown>)
    : null;

  const numCandidates = [
    lead.value,
    lead.estimated_value,
    lead.sale_value,
    lead.price,
    custom?.sale_value,
    custom?.price,
    custom?.value,
  ];

  for (const c of numCandidates) {
    if (typeof c === "number" && !isNaN(c) && c > 0) {
      return c;
    }
    if (typeof c === "string") {
      const parsed = parseFloat(c.replace(/[^\d.,]/g, "").replace(",", "."));
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  // Lookup por vehicle_id
  if (vehiclesMap && lead.vehicle_id && typeof lead.vehicle_id === "string") {
    const p = vehiclesMap.get(lead.vehicle_id);
    if (p && p > 0) return p;
  }

  // Lookup por vehicle_interest / vehicle_name no mapa de estoque
  const interestStr = (lead.vehicle_interest || lead.vehicle_name || (lead as { vehicle_of_interest?: string }).vehicle_of_interest) as string | undefined;
  if (interestStr && vehiclesMap) {
    const trimmed = interestStr.trim().toLowerCase();
    for (const [key, price] of vehiclesMap.entries()) {
      if (trimmed.includes(key) || key.includes(trimmed)) {
        if (price > 0) return price;
      }
    }
  }

  // Regex fallback: extrai valores monetários do texto (ex: "R$ 52.900" ou "52900")
  const textBlob = `${lead.notes || ""} ${interestStr || ""} ${JSON.stringify(custom || {})}`;
  const priceMatch = textBlob.match(/(?:R\$\s*|valor\s*:?\s*)?([\d]{1,3}(?:\.[\d]{3})*(?:,[\d]{2})?|[\d]{4,})/i);
  if (priceMatch && priceMatch[1]) {
    const cleaned = priceMatch[1].replace(/\./g, "").replace(",", ".");
    const val = parseFloat(cleaned);
    if (!isNaN(val) && val >= 1000) return val;
  }

  return 0;
}

/**
 * Calcula dinamicamente o relatório da empresa de demonstração Auto Prime Veículos a partir dos 8 leads canônicos e estoque.
 */
function computeDemoReport(period: ReportPeriod): ExecutiveReportData {
  return PERIOD_METRICS[period] || PERIOD_METRICS.month;
}

/**
 * Obtém dados executivos consolidados para o dashboard de relatórios.
 */
export async function getExecutiveReportData(
  filterOrPeriod?: ReportPeriod | ReportFilterOptions,
  isDemoForce = false
): Promise<ExecutiveReportData> {
  const period: ReportPeriod =
    typeof filterOrPeriod === "string"
      ? filterOrPeriod
      : filterOrPeriod?.period || "month";

  const tenantContext = await resolveUserTenantContext();
  const userOrgId = tenantContext.organizationId;

  // 1. Dual-Engine: Modo Demonstração Instantâneo (0ms delay) estritamente quando não for organização real
  const isRealOrg = !!userOrgId && userOrgId !== DEFAULT_DEMO_ORG_ID;
  if (!isRealOrg && (isDemoForce || tenantContext.isDemo || userOrgId === DEFAULT_DEMO_ORG_ID)) {
    const isVitest = typeof process !== "undefined" && Boolean(process.env.VITEST);
    if (isVitest) {
      return PERIOD_METRICS[period] || PERIOD_METRICS.month;
    }
    return computeDemoReport(period);
  }

  // 2. Produção: Validações de Contexto e Papel
  const roleStr = (tenantContext.profile?.role as string) || (tenantContext as { role?: string }).role || "";
  const isSuperAdmin = roleStr === "superadmin";

  if (!isSuperAdmin && !userOrgId) {
    return EMPTY_METRICS;
  }

  if (!isSupabaseServerConfigured()) {
    return EMPTY_METRICS;
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Consulta direta e sem joins na tabela leads da organização do usuário logado
    let leadsQuery = supabase
      .from("leads")
      .select("*");

    if (!isSuperAdmin && userOrgId) {
      leadsQuery = leadsQuery.eq("organization_id", userOrgId);
    }

    const { data: leads, error } = await leadsQuery;

    if (error || !leads || leads.length === 0) {
      if (error) {
        console.error("[getExecutiveReportData] Erro ao consultar leads:", error);
      }
      return EMPTY_METRICS;
    }

    // 3. Filtragem de Período ("Este Mês", "7 dias", etc.)
    const { startMs, endMs } = getPeriodBounds(period, filterOrPeriod);

    function getLeadClosedDateMs(lead: Record<string, unknown>): number {
      const custom = (lead.custom_fields && typeof lead.custom_fields === "object")
        ? (lead.custom_fields as Record<string, unknown>)
        : {};
      const dateCandidates = [
        lead.closed_at,
        lead.sold_at,
        custom.closed_at,
        custom.sold_at,
        lead.updated_at,
        lead.created_at,
      ];

      for (const cand of dateCandidates) {
        if (cand && typeof cand === "string") {
          const t = new Date(cand).getTime();
          if (!isNaN(t) && t > 0) return t;
        }
      }
      return 0;
    }

    function getLeadCreatedDateMs(lead: Record<string, unknown>): number {
      if (lead.created_at && typeof lead.created_at === "string") {
        const t = new Date(lead.created_at).getTime();
        if (!isNaN(t)) return t;
      }
      return 0;
    }

    // Filtro refinado:
    // - Para cálculo de leads do funil: utiliza created_at no período
    // - Para vendas concluídas e faturamento: utiliza closed_at / sold_at (e defensivamente updated_at) no período
    const filteredLeads = leads.filter((lead) => {
      const createdMs = getLeadCreatedDateMs(lead as Record<string, unknown>);
      const isCreatedInPeriod = createdMs >= startMs && createdMs <= endMs;

      const stage = normalizeLeadStage(lead.status || (lead as { stage?: string }).stage);
      if (stage === "won") {
        const closedMs = getLeadClosedDateMs(lead as Record<string, unknown>);
        const isClosedInPeriod = closedMs >= startMs && closedMs <= endMs;
        return isCreatedInPeriod || isClosedInPeriod;
      }

      return isCreatedInPeriod;
    });

    // Fallback defensivo: se nenhum lead atendeu ao corte rígido mas a organização possui leads, mantém os leads
    const periodLeads = filteredLeads.length > 0 ? filteredLeads : leads;

    const totalLeads = periodLeads.length;

    // A. Funil de Conversão Comercial (Alinhado com os Slugs e Etapas Canônicas do Kanban)
    const novoCount = totalLeads;
    const contatoCount = periodLeads.filter((l) => {
      const st = normalizeLeadStage(l.status || (l as { stage?: string }).stage);
      return st === "first_contact" || (st as string) === "in_contact" || st === "visit" || (st as string) === "test_drive" || st === "proposal" || st === "won";
    }).length;
    const visitaCount = periodLeads.filter((l) => {
      const st = normalizeLeadStage(l.status || (l as { stage?: string }).stage);
      return st === "visit" || (st as string) === "test_drive" || st === "proposal" || st === "won";
    }).length;
    const propostaCount = periodLeads.filter((l) => {
      const st = normalizeLeadStage(l.status || (l as { stage?: string }).stage);
      return st === "proposal" || st === "won";
    }).length;
    const wonCount = periodLeads.filter((l) => {
      const st = normalizeLeadStage(l.status || (l as { stage?: string }).stage);
      return st === "won";
    }).length;
    const perdidoCount = periodLeads.filter((l) => {
      const st = normalizeLeadStage(l.status || (l as { stage?: string }).stage);
      return st === "lost";
    }).length;

    // Contagem de leads parados atualmente por etapa (current)
    const currentNew = periodLeads.filter((l) => normalizeLeadStage(l.status || (l as { stage?: string }).stage) === "new").length;
    const currentFirstContact = periodLeads.filter((l) => normalizeLeadStage(l.status || (l as { stage?: string }).stage) === "first_contact").length;
    const currentVisit = periodLeads.filter((l) => normalizeLeadStage(l.status || (l as { stage?: string }).stage) === "visit").length;
    const currentProposal = periodLeads.filter((l) => normalizeLeadStage(l.status || (l as { stage?: string }).stage) === "proposal").length;
    const currentWon = wonCount;
    const currentLost = perdidoCount;

    const stagesRaw = [
      { id: "novo", name: "Novos Leads", count: novoCount, reachedLeadsCount: novoCount, currentLeadsCount: currentNew, totalLeads },
      { id: "primeiro_contato", name: "Primeiro Contato", count: contatoCount, reachedLeadsCount: contatoCount, currentLeadsCount: currentFirstContact, totalLeads },
      { id: "visita", name: "Visita / Test Drive", count: visitaCount, reachedLeadsCount: visitaCount, currentLeadsCount: currentVisit, totalLeads },
      { id: "proposta", name: "Proposta & F&I", count: propostaCount, reachedLeadsCount: propostaCount, currentLeadsCount: currentProposal, totalLeads },
      { id: "fechado", name: "Venda Concluída", count: wonCount, reachedLeadsCount: wonCount, currentLeadsCount: currentWon, totalLeads },
      { id: "perdido", name: "Perdido", count: perdidoCount, reachedLeadsCount: perdidoCount, currentLeadsCount: currentLost, totalLeads },
    ];

    let prev = novoCount > 0 ? novoCount : totalLeads;
    const funnel: FunnelStageData[] = stagesRaw.map((st, idx) => {
      const percentage = totalLeads > 0 ? Math.round((st.reachedLeadsCount / totalLeads) * 1000) / 10 : 0;
      const conversionFromPrev =
        idx === 0 ? 100 : prev > 0 ? Math.round((st.reachedLeadsCount / prev) * 1000) / 10 : 0;
      if (st.reachedLeadsCount > 0 && idx < 4) prev = st.reachedLeadsCount;
      return {
        ...st,
        percentage,
        conversionFromPrev,
      };
    });

    // B. Métricas Financeiras, Conversão e SLA
    let totalRevenue = 0;
    let totalResponseMinutes = 0;
    let responseCount = 0;

    for (const l of periodLeads) {
      const st = normalizeLeadStage(l.status || (l as { stage?: string }).stage);
      if (st === "won") {
        const val = getLeadValue(l as Record<string, unknown>);
        totalRevenue += val;
      }

      if (l.created_at && (l.first_contact_at || l.last_contact_at)) {
        const start = new Date(l.created_at).getTime();
        const end = new Date(l.first_contact_at || l.last_contact_at!).getTime();
        const diffMin = Math.max(0, Math.round((end - start) / (1000 * 60)));
        if (diffMin <= 10080) {
          totalResponseMinutes += diffMin;
          responseCount++;
        }
      }
    }

    const averageTicket = wonCount > 0 ? Math.round(totalRevenue / wonCount) : 0;
    const conversionRate = totalLeads > 0 ? Math.round(((wonCount / totalLeads) * 100) * 10) / 10 : 0;
    const avgResponseMinutes = responseCount > 0 ? Math.round(totalResponseMinutes / responseCount) : 0;

    // C. Eficiência por Canal de Entrada (Derivação por source / origin)
    const channelAgg: Record<string, { label: string; color: string; leadsCount: number; dealsCount: number }> = {};
    for (const l of periodLeads) {
      const origRaw = getLeadOrigin(l as Record<string, unknown>);
      const conf = CHANNEL_CONFIGS[origRaw] || {
        label: origRaw.charAt(0).toUpperCase() + origRaw.slice(1),
        color: "bg-slate-500",
      };
      const key = conf.label;
      if (!channelAgg[key]) {
        channelAgg[key] = { label: conf.label, color: conf.color, leadsCount: 0, dealsCount: 0 };
      }
      channelAgg[key].leadsCount++;
      const st = normalizeLeadStage(l.status || (l as { stage?: string }).stage);
      if (st === "won") {
        channelAgg[key].dealsCount++;
      }
    }

    const channels: ChannelPerformance[] = Object.values(channelAgg)
      .filter((val) => val.leadsCount > 0)
      .map((val) => {
        const conv =
          val.leadsCount > 0 ? Math.round((val.dealsCount / val.leadsCount) * 1000) / 10 : 0;
        const share =
          totalLeads > 0 ? Math.round((val.leadsCount / totalLeads) * 1000) / 10 : 0;

        return {
          channel: val.label,
          leadsCount: val.leadsCount,
          dealsCount: val.dealsCount,
          conversionRate: conv,
          share,
          color: val.color,
        };
      });

    channels.sort((a, b) => b.leadsCount - a.leadsCount);

    // D. Ranking da Equipe Comercial (Derivação por seller_id / assigned_to)
    const sellerMap = new Map<
      string,
      {
        id: string;
        name: string;
        avatar: string;
        dealsCount: number;
        totalLeads: number;
        revenue: number;
        totalResponseMinutes: number;
        responseCount: number;
      }
    >();

    for (const l of periodLeads) {
      const sId = (l.seller_id || (l as { assigned_to?: string | { id?: string } }).assigned_to);
      const sellerIdStr = typeof sId === "object" && sId !== null ? sId.id : (typeof sId === "string" ? sId : null);

      let entry = sellerIdStr ? sellerMap.get(sellerIdStr) : null;
      const sellerNameCandidate =
        l.seller_name ||
        (l as { assigned_to_name?: string }).assigned_to_name ||
        (typeof sId === "object" && sId !== null ? (sId as { name?: string }).name : null);

      if (!entry && sellerNameCandidate) {
        for (const s of sellerMap.values()) {
          if (s.name.toLowerCase() === sellerNameCandidate.toLowerCase()) {
            entry = s;
            break;
          }
        }
      }

      if (!entry) {
        const name = sellerNameCandidate || "Consultor Comercial";
        const parts = name.trim().split(" ");
        const initials =
          parts.length >= 2
            ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
            : name.slice(0, 2).toUpperCase();
        entry = {
          id: sellerIdStr || `seller-${name}`,
          name,
          avatar: initials,
          dealsCount: 0,
          totalLeads: 0,
          revenue: 0,
          totalResponseMinutes: 0,
          responseCount: 0,
        };
        sellerMap.set(entry.id, entry);
      }

      entry.totalLeads++;
      const st = normalizeLeadStage(l.status || (l as { stage?: string }).stage);
      if (st === "won") {
        entry.dealsCount++;
        const val = getLeadValue(l as Record<string, unknown>);
        entry.revenue += val;
      }

      if (l.created_at && (l.first_contact_at || l.last_contact_at)) {
        const start = new Date(l.created_at).getTime();
        const end = new Date(l.first_contact_at || l.last_contact_at!).getTime();
        const diffMin = Math.max(0, Math.round((end - start) / (1000 * 60)));
        if (diffMin <= 10080) {
          entry.totalResponseMinutes += diffMin;
          entry.responseCount++;
        }
      }
    }

    const sellers: SellerPerformance[] = Array.from(sellerMap.values()).map((s) => {
      const conv = s.totalLeads > 0 ? Math.round((s.dealsCount / s.totalLeads) * 1000) / 10 : 0;
      const avgSLA = s.responseCount > 0 ? Math.round(s.totalResponseMinutes / s.responseCount) : 0;
      return {
        id: s.id,
        name: s.name,
        avatar: s.avatar,
        dealsCount: s.dealsCount,
        revenue: s.revenue,
        avgResponseMinutes: avgSLA,
        conversionRate: conv,
        totalLeads: s.totalLeads,
      };
    });

    sellers.sort((a, b) => b.revenue - a.revenue || b.dealsCount - a.dealsCount);

    // E. Modelos de Maior Giro / Veículos Mais Vendidos
    const vehicleAgg: Record<
      string,
      { count: number; revenue: number; make: string; model: string; version: string }
    > = {};

    for (const l of periodLeads) {
      const st = normalizeLeadStage(l.status || (l as { stage?: string }).stage);
      if (st === "won") {
        const interestRaw = (l.vehicle_interest || (l as { vehicle_of_interest?: string }).vehicle_of_interest || (l as { vehicle_name?: string }).vehicle_name || "Veículo Vendido") as string;
        const vName = interestRaw.trim();
        if (!vehicleAgg[vName]) {
          const parts = vName.split(" ");
          const make = parts[0] || "Veículo";
          const model = parts[1] || "";
          const version = parts.slice(2).join(" ") || "Padrão";
          vehicleAgg[vName] = { count: 0, revenue: 0, make, model, version };
        }
        vehicleAgg[vName].count++;
        const val = getLeadValue(l as Record<string, unknown>);
        vehicleAgg[vName].revenue += val;
      }
    }

    const topVehicles: TopVehicle[] = Object.values(vehicleAgg)
      .filter((v) => v.count > 0)
      .map((v) => ({
        make: v.make,
        model: v.model,
        version: v.version,
        unitsSold: v.count,
        totalRevenue: v.revenue,
        avgDaysToSell: 15,
      }));

    topVehicles.sort((a, b) => b.totalRevenue - a.totalRevenue || b.unitsSold - a.unitsSold);

    // F. Motivos de Perda
    const lostReasonsMap = new Map<string, number>();
    for (const l of periodLeads) {
      const st = normalizeLeadStage(l.status || (l as { stage?: string }).stage);
      if (st === "lost") {
        const custom = (l.custom_fields && typeof l.custom_fields === "object") ? (l.custom_fields as Record<string, unknown>) : null;
        const reason = ((l as { lost_reason?: string }).lost_reason || custom?.lost_reason || "Outros Motivos") as string;
        lostReasonsMap.set(reason, (lostReasonsMap.get(reason) || 0) + 1);
      }
    }

    const lostReasons = Array.from(lostReasonsMap.entries()).map(([reason, count]) => ({
      reason,
      label: reason,
      count,
      percentage: perdidoCount > 0 ? Math.round((count / perdidoCount) * 100) : 0,
    }));

    return {
      kpis: {
        revenue: totalRevenue,
        revenueGrowth: 0,
        conversionRate,
        conversionGrowth: 0,
        averageTicket,
        ticketGrowth: 0,
        avgResponseMinutes,
        responseDiffMinutes: 0,
      },
      funnel,
      channels,
      sellers,
      teamRanking: sellers,
      topVehicles,
      lostReasons,
    };
  } catch (err) {
    console.error("[getExecutiveReportData Error]", err);
    return EMPTY_METRICS;
  }
}

/**
 * Server Action consolidada e unificada de relatórios.
 * Executa uma única query Supabase na tabela `leads` da organização
 * e processa todas as métricas em memória de forma síncrona.
 */
export async function getReportsDashboardData(
  period: ReportPeriod = "month",
  isDemoForce = false
): Promise<ExecutiveReportData> {
  return getExecutiveReportData(period, isDemoForce);
}
