/**
 * @file reports.ts
 * @description Server Actions para relatórios executivos e inteligência comercial.
 *
 * Suporta arquitetura Dual-Engine:
 * 1. Modo Demo (isDemoMode = true ou tenant demo): Retorna instantaneamente fixtures estruturadas (0ms delay).
 * 2. Produção (Supabase): Agrega dados da tabela `leads` respeitando o isolamento estrito por `organization_id`
 *    ou consolidando globalmente para `superadmin`.
 */

"use server";

import { resolveUserTenantContext } from "@/lib/auth/tenant";
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

const CHANNEL_CONFIGS: Record<string, { label: string; color: string }> = {
  whatsapp: { label: "WhatsApp", color: "bg-emerald-500" },
  instagram: { label: "Instagram", color: "bg-pink-500" },
  site: { label: "Site Oficial", color: "bg-blue-500" },
  olx: { label: "OLX", color: "bg-orange-500" },
  indicacao: { label: "Indicação", color: "bg-amber-500" },
  meta: { label: "Meta Ads", color: "bg-pink-600" },
  icarros: { label: "iCarros", color: "bg-red-500" },
  webmotors: { label: "Webmotors", color: "bg-red-600" },
  telefone: { label: "Telefone Direto", color: "bg-cyan-500" },
  patio_balcao: { label: "Pátio / Balcão", color: "bg-purple-500" },
  indicacao_dono: { label: "Indicação da Diretoria", color: "bg-amber-600" },
  cliente_carteira: { label: "Cliente Carteira", color: "bg-teal-500" },
};

function getStartDateFromPeriod(period: ReportPeriod): string {
  const now = new Date();
  switch (period) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    case "quarter":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    case "year":
      return new Date(now.getFullYear(), 0, 1).toISOString();
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }
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

  // 1. Dual-Engine: Modo Demonstração Instantâneo (0ms delay)
  if (isDemoForce || tenantContext.isDemo) {
    return PERIOD_METRICS[period] || PERIOD_METRICS.month;
  }

  // 2. Produção: Validações de Contexto e Papel
  const roleStr = (tenantContext.profile?.role as string) || (tenantContext as any).role || "";
  const isSuperAdmin = roleStr === "superadmin";

  if (!isSuperAdmin && !tenantContext.organizationId) {
    return EMPTY_METRICS;
  }

  if (!isSupabaseServerConfigured()) {
    return EMPTY_METRICS;
  }

  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase.from("leads").select("*");

    // Isolamento multi-tenant estrito (Bypass permitido exclusivamente para superadmin)
    if (!isSuperAdmin && tenantContext.organizationId) {
      query = query.eq("organization_id", tenantContext.organizationId);
    }

    // Filtragem por intervalo de datas
    if (typeof filterOrPeriod === "object" && filterOrPeriod.from) {
      query = query.gte("created_at", filterOrPeriod.from);
      if (filterOrPeriod.to) {
        query = query.lte("created_at", filterOrPeriod.to);
      }
    } else {
      const startDate = getStartDateFromPeriod(period);
      query = query.gte("created_at", startDate);
    }

    const { data: leads, error } = await query;

    if (error || !leads || leads.length === 0) {
      return EMPTY_METRICS;
    }

    const totalLeads = leads.length;

    // A. Funil de Conversão
    const novoCount = totalLeads;
    const atendimentoCount = leads.filter(
      (l) => l.status === "atendimento" || l.status === "visita" || l.status === "proposta" || l.status === "fechado"
    ).length;
    const visitaCount = leads.filter(
      (l) => l.status === "visita" || l.status === "proposta" || l.status === "fechado"
    ).length;
    const propostaCount = leads.filter((l) => l.status === "proposta" || l.status === "fechado").length;
    const fechadoCount = leads.filter((l) => l.status === "fechado").length;

    const stagesRaw = [
      { id: "novo", name: "Novo Lead", count: novoCount },
      { id: "atendimento", name: "Em Atendimento", count: atendimentoCount },
      { id: "visita", name: "Visita / Test-Drive", count: visitaCount },
      { id: "proposta", name: "Proposta", count: propostaCount },
      { id: "fechado", name: "Venda Fechada", count: fechadoCount },
    ];

    let prev = novoCount;
    const funnel: FunnelStageData[] = stagesRaw.map((st, idx) => {
      const percentage = novoCount > 0 ? Math.round((st.count / novoCount) * 1000) / 10 : 0;
      const conversionFromPrev =
        idx === 0 ? 100 : prev > 0 ? Math.round((st.count / prev) * 1000) / 10 : 0;
      prev = st.count;
      return {
        ...st,
        percentage,
        conversionFromPrev,
      };
    });

    // B. Métricas Financeiras & Volume
    let totalRevenue = 0;
    for (const l of leads) {
      if (l.status === "fechado") {
        const custom = l.custom_fields as Record<string, unknown> | null;
        const val =
          typeof custom?.sale_value === "number"
            ? custom.sale_value
            : typeof custom?.value === "number"
            ? custom.value
            : 0;
        totalRevenue += val;
      }
    }

    const averageTicket = fechadoCount > 0 ? Math.round(totalRevenue / fechadoCount) : 0;
    const conversionRate = totalLeads > 0 ? Math.round((fechadoCount / totalLeads) * 1000) / 10 : 0;

    // C. Eficiência por Canal / Origem
    const channelAgg: Record<string, { leadsCount: number; dealsCount: number }> = {};
    for (const l of leads) {
      const orig = l.origin || "site";
      if (!channelAgg[orig]) {
        channelAgg[orig] = { leadsCount: 0, dealsCount: 0 };
      }
      channelAgg[orig].leadsCount++;
      if (l.status === "fechado") {
        channelAgg[orig].dealsCount++;
      }
    }

    const channels: ChannelPerformance[] = Object.entries(channelAgg).map(([origKey, val]) => {
      const conf = CHANNEL_CONFIGS[origKey] || {
        label: origKey.charAt(0).toUpperCase() + origKey.slice(1),
        color: "bg-slate-500",
      };
      const conv =
        val.leadsCount > 0 ? Math.round((val.dealsCount / val.leadsCount) * 1000) / 10 : 0;
      const share =
        totalLeads > 0 ? Math.round((val.leadsCount / totalLeads) * 1000) / 10 : 0;

      return {
        channel: conf.label,
        leadsCount: val.leadsCount,
        dealsCount: val.dealsCount,
        conversionRate: conv,
        share,
        color: conf.color,
      };
    });

    // Ordena canais pelo maior número de leads
    channels.sort((a, b) => b.leadsCount - a.leadsCount);

    // D. Ranking de Consultores
    const sellerAgg: Record<
      string,
      { id: string; name: string; dealsCount: number; totalLeads: number; revenue: number }
    > = {};

    for (const l of leads) {
      const sName = l.seller_name || "Vendedor Geral";
      const sId = l.seller_id || sName;
      if (!sellerAgg[sName]) {
        sellerAgg[sName] = {
          id: sId,
          name: sName,
          dealsCount: 0,
          totalLeads: 0,
          revenue: 0,
        };
      }
      sellerAgg[sName].totalLeads++;
      if (l.status === "fechado") {
        sellerAgg[sName].dealsCount++;
        const custom = l.custom_fields as Record<string, unknown> | null;
        const val =
          typeof custom?.sale_value === "number"
            ? custom.sale_value
            : typeof custom?.value === "number"
            ? custom.value
            : 0;
        sellerAgg[sName].revenue += val;
      }
    }

    const sellers: SellerPerformance[] = Object.values(sellerAgg).map((s) => {
      const parts = s.name.trim().split(" ");
      const initials =
        parts.length >= 2
          ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
          : s.name.slice(0, 2).toUpperCase();

      const conv =
        s.totalLeads > 0 ? Math.round((s.dealsCount / s.totalLeads) * 1000) / 10 : 0;

      return {
        id: s.id,
        name: s.name,
        avatar: initials,
        dealsCount: s.dealsCount,
        revenue: s.revenue,
        avgResponseMinutes: 15,
        conversionRate: conv,
      };
    });

    sellers.sort((a, b) => b.dealsCount - a.dealsCount || b.revenue - a.revenue);

    // E. Modelos de Maior Giro / Veículos Mais Vendidos
    const vehicleAgg: Record<string, { count: number; revenue: number }> = {};
    for (const l of leads) {
      if (l.status === "fechado" && l.vehicle_interest) {
        const vName = l.vehicle_interest.trim();
        if (!vehicleAgg[vName]) {
          vehicleAgg[vName] = { count: 0, revenue: 0 };
        }
        vehicleAgg[vName].count++;
        const custom = l.custom_fields as Record<string, unknown> | null;
        const val =
          typeof custom?.sale_value === "number"
            ? custom.sale_value
            : typeof custom?.value === "number"
            ? custom.value
            : 0;
        vehicleAgg[vName].revenue += val;
      }
    }

    const topVehicles: TopVehicle[] = Object.entries(vehicleAgg).map(([vName, vData]) => {
      const parts = vName.split(" ");
      const make = parts[0] || "Veículo";
      const model = parts[1] || "";
      const version = parts.slice(2).join(" ") || "Padrão";

      return {
        make,
        model,
        version,
        unitsSold: vData.count,
        totalRevenue: vData.revenue,
        avgDaysToSell: 15,
      };
    });

    topVehicles.sort((a, b) => b.unitsSold - a.unitsSold || b.totalRevenue - a.totalRevenue);

    return {
      kpis: {
        revenue: totalRevenue,
        revenueGrowth: 0,
        conversionRate,
        conversionGrowth: 0,
        averageTicket,
        ticketGrowth: 0,
        avgResponseMinutes: 15,
        responseDiffMinutes: 0,
      },
      funnel,
      channels,
      sellers,
      topVehicles,
    };
  } catch (err) {
    console.error("[getExecutiveReportData Error]", err);
    return EMPTY_METRICS;
  }
}
