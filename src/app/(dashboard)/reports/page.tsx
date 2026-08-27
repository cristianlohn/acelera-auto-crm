/**
 * @file page.tsx
 * @description Módulo de Relatórios Executivos e Indicadores Comerciais (Analytics).
 *
 * Apresenta:
 * - KPIs Executivos (Faturamento, Conversão, Ticket Médio, SLA de Resposta).
 * - Filtro dinâmico e reativo de período (7 dias, Este Mês, Trimestre, Ano).
 * - Funil de Conversão Comercial com taxas de passagem entre as 5 etapas.
 * - Eficiência de Vendas por Canal de Aquisição (WhatsApp, Instagram, Site, OLX, Indicação).
 * - Ranking de Performance da Equipe Comercial com destaque para o Top 1.
 * - Modelos de Maior Giro e Receita no Pátio.
 * - Exportação de relatórios com feedback visual.
 */

"use client";

import { useState, useTransition } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Car,
  Clock,
  Download,
  CheckCircle2,
  Users,
  Layers,
  Sparkles,
  Share2,
  Lock,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/mock-data";
import { useDemoRole } from "@/context/demo-role-context";

// ---------------------------------------------------------------------------
// Tipos de Domínio do Módulo de Analytics
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Mock Data Estruturado por Período
// ---------------------------------------------------------------------------

const PERIOD_OPTIONS: PeriodOption[] = [
  { id: "7d", label: "7 dias" },
  { id: "month", label: "Este Mês" },
  { id: "quarter", label: "Trimestre" },
  { id: "year", label: "Ano" },
];

const PERIOD_METRICS: Record<
  ReportPeriod,
  {
    kpis: KPIStats;
    funnel: FunnelStageData[];
    channels: ChannelPerformance[];
    sellers: SellerPerformance[];
    topVehicles: TopVehicle[];
  }
> = {
  "7d": {
    kpis: {
      revenue: 449700,
      revenueGrowth: 12.5,
      conversionRate: 15.8,
      conversionGrowth: 1.8,
      averageTicket: 149900,
      ticketGrowth: 3.2,
      avgResponseMinutes: 14,
      responseDiffMinutes: -3,
    },
    funnel: [
      { id: "novo", name: "Novo Lead", count: 38, percentage: 100, conversionFromPrev: 100 },
      { id: "atendimento", name: "Em Atendimento", count: 31, percentage: 81.6, conversionFromPrev: 81.6 },
      { id: "visita", name: "Visita / Test-Drive", count: 14, percentage: 36.8, conversionFromPrev: 45.2 },
      { id: "proposta", name: "Proposta", count: 9, percentage: 23.7, conversionFromPrev: 64.3 },
      { id: "fechado", name: "Venda Fechada", count: 6, percentage: 15.8, conversionFromPrev: 66.7 },
    ],
    channels: [
      { channel: "WhatsApp", leadsCount: 18, dealsCount: 4, conversionRate: 22.2, share: 47.4, color: "bg-emerald-500" },
      { channel: "Instagram", leadsCount: 10, dealsCount: 1, conversionRate: 10.0, share: 26.3, color: "bg-pink-500" },
      { channel: "Site Oficial", leadsCount: 6, dealsCount: 1, conversionRate: 16.7, share: 15.8, color: "bg-blue-500" },
      { channel: "Indicação", leadsCount: 4, dealsCount: 0, conversionRate: 0.0, share: 10.5, color: "bg-amber-500" },
    ],
    sellers: [
      { id: "s1", name: "Rafael Alves", avatar: "RA", dealsCount: 3, revenue: 299800, avgResponseMinutes: 11, conversionRate: 21.4 },
      { id: "s2", name: "Camila Dias", avatar: "CD", dealsCount: 2, revenue: 149900, avgResponseMinutes: 16, conversionRate: 16.7 },
      { id: "s3", name: "Lucas Santana", avatar: "LS", dealsCount: 1, revenue: 89900, avgResponseMinutes: 18, conversionRate: 12.5 },
    ],
    topVehicles: [
      { make: "Honda", model: "Civic", version: "EXL 2.0 CVT", unitsSold: 2, totalRevenue: 299800, avgDaysToSell: 14 },
      { make: "Toyota", model: "Corolla Cross", version: "XRE 2.0", unitsSold: 1, totalRevenue: 168900, avgDaysToSell: 19 },
    ],
  },
  month: {
    kpis: {
      revenue: 1845000,
      revenueGrowth: 18.4,
      conversionRate: 14.2,
      conversionGrowth: 2.1,
      averageTicket: 153750,
      ticketGrowth: 4.8,
      avgResponseMinutes: 18,
      responseDiffMinutes: -4,
    },
    funnel: [
      { id: "novo", name: "Novo Lead", count: 120, percentage: 100, conversionFromPrev: 100 },
      { id: "atendimento", name: "Em Atendimento", count: 98, percentage: 81.7, conversionFromPrev: 81.7 },
      { id: "visita", name: "Visita / Test-Drive", count: 45, percentage: 37.5, conversionFromPrev: 45.9 },
      { id: "proposta", name: "Proposta", count: 28, percentage: 23.3, conversionFromPrev: 62.2 },
      { id: "fechado", name: "Venda Fechada", count: 17, percentage: 14.2, conversionFromPrev: 60.7 },
    ],
    channels: [
      { channel: "WhatsApp", leadsCount: 54, dealsCount: 10, conversionRate: 18.5, share: 45.0, color: "bg-emerald-500" },
      { channel: "Instagram", leadsCount: 30, dealsCount: 3, conversionRate: 10.0, share: 25.0, color: "bg-pink-500" },
      { channel: "Site Oficial", leadsCount: 18, dealsCount: 2, conversionRate: 11.1, share: 15.0, color: "bg-blue-500" },
      { channel: "OLX", leadsCount: 12, dealsCount: 1, conversionRate: 8.3, share: 10.0, color: "bg-orange-500" },
      { channel: "Indicação", leadsCount: 6, dealsCount: 1, conversionRate: 16.7, share: 5.0, color: "bg-amber-500" },
    ],
    sellers: [
      { id: "s1", name: "Rafael Alves", avatar: "RA", dealsCount: 8, revenue: 980000, avgResponseMinutes: 12, conversionRate: 22.8 },
      { id: "s2", name: "Camila Dias", avatar: "CD", dealsCount: 5, revenue: 520000, avgResponseMinutes: 19, conversionRate: 15.2 },
      { id: "s3", name: "Lucas Santana", avatar: "LS", dealsCount: 3, revenue: 245000, avgResponseMinutes: 24, conversionRate: 11.5 },
      { id: "s4", name: "Beatriz Rocha", avatar: "BR", dealsCount: 1, revenue: 100000, avgResponseMinutes: 32, conversionRate: 7.1 },
    ],
    topVehicles: [
      { make: "Honda", model: "Civic", version: "EXL 2.0 CVT", unitsSold: 4, totalRevenue: 599600, avgDaysToSell: 12 },
      { make: "Toyota", model: "Corolla Cross", version: "XRE 2.0", unitsSold: 3, totalRevenue: 506700, avgDaysToSell: 18 },
      { make: "Jeep", model: "Compass", version: "Longitude 1.3 T", unitsSold: 3, totalRevenue: 404700, avgDaysToSell: 22 },
      { make: "Fiat", model: "Strada", version: "Volcano 1.3 CD", unitsSold: 2, totalRevenue: 220000, avgDaysToSell: 9 },
    ],
  },
  quarter: {
    kpis: {
      revenue: 5420000,
      revenueGrowth: 24.6,
      conversionRate: 14.8,
      conversionGrowth: 3.4,
      averageTicket: 150555,
      ticketGrowth: 6.1,
      avgResponseMinutes: 21,
      responseDiffMinutes: -6,
    },
    funnel: [
      { id: "novo", name: "Novo Lead", count: 365, percentage: 100, conversionFromPrev: 100 },
      { id: "atendimento", name: "Em Atendimento", count: 295, percentage: 80.8, conversionFromPrev: 80.8 },
      { id: "visita", name: "Visita / Test-Drive", count: 142, percentage: 38.9, conversionFromPrev: 48.1 },
      { id: "proposta", name: "Proposta", count: 88, percentage: 24.1, conversionFromPrev: 62.0 },
      { id: "fechado", name: "Venda Fechada", count: 54, percentage: 14.8, conversionFromPrev: 61.4 },
    ],
    channels: [
      { channel: "WhatsApp", leadsCount: 168, dealsCount: 32, conversionRate: 19.0, share: 46.0, color: "bg-emerald-500" },
      { channel: "Instagram", leadsCount: 92, dealsCount: 11, conversionRate: 12.0, share: 25.2, color: "bg-pink-500" },
      { channel: "Site Oficial", leadsCount: 55, dealsCount: 6, conversionRate: 10.9, share: 15.1, color: "bg-blue-500" },
      { channel: "OLX", leadsCount: 32, dealsCount: 3, conversionRate: 9.4, share: 8.8, color: "bg-orange-500" },
      { channel: "Indicação", leadsCount: 18, dealsCount: 2, conversionRate: 11.1, share: 4.9, color: "bg-amber-500" },
    ],
    sellers: [
      { id: "s1", name: "Rafael Alves", avatar: "RA", dealsCount: 24, revenue: 2850000, avgResponseMinutes: 13, conversionRate: 23.5 },
      { id: "s2", name: "Camila Dias", avatar: "CD", dealsCount: 16, revenue: 1620000, avgResponseMinutes: 18, conversionRate: 16.1 },
      { id: "s3", name: "Lucas Santana", avatar: "LS", dealsCount: 9, revenue: 710000, avgResponseMinutes: 22, conversionRate: 11.8 },
      { id: "s4", name: "Beatriz Rocha", avatar: "BR", dealsCount: 5, revenue: 240000, avgResponseMinutes: 29, conversionRate: 8.3 },
    ],
    topVehicles: [
      { make: "Honda", model: "Civic", version: "EXL 2.0 CVT", unitsSold: 12, totalRevenue: 1798800, avgDaysToSell: 11 },
      { make: "Toyota", model: "Corolla Cross", version: "XRE 2.0", unitsSold: 9, totalRevenue: 1520100, avgDaysToSell: 16 },
      { make: "Jeep", model: "Compass", version: "Longitude 1.3 T", unitsSold: 8, totalRevenue: 1079200, avgDaysToSell: 20 },
    ],
  },
  year: {
    kpis: {
      revenue: 19800000,
      revenueGrowth: 31.2,
      conversionRate: 15.4,
      conversionGrowth: 4.2,
      averageTicket: 148872,
      ticketGrowth: 7.9,
      avgResponseMinutes: 20,
      responseDiffMinutes: -8,
    },
    funnel: [
      { id: "novo", name: "Novo Lead", count: 1420, percentage: 100, conversionFromPrev: 100 },
      { id: "atendimento", name: "Em Atendimento", count: 1150, percentage: 81.0, conversionFromPrev: 81.0 },
      { id: "visita", name: "Visita / Test-Drive", count: 560, percentage: 39.4, conversionFromPrev: 48.7 },
      { id: "proposta", name: "Proposta", count: 345, percentage: 24.3, conversionFromPrev: 61.6 },
      { id: "fechado", name: "Venda Fechada", count: 218, percentage: 15.4, conversionFromPrev: 63.2 },
    ],
    channels: [
      { channel: "WhatsApp", leadsCount: 650, dealsCount: 128, conversionRate: 19.7, share: 45.8, color: "bg-emerald-500" },
      { channel: "Instagram", leadsCount: 360, dealsCount: 44, conversionRate: 12.2, share: 25.4, color: "bg-pink-500" },
      { channel: "Site Oficial", leadsCount: 215, dealsCount: 25, conversionRate: 11.6, share: 15.1, color: "bg-blue-500" },
      { channel: "OLX", leadsCount: 125, dealsCount: 12, conversionRate: 9.6, share: 8.8, color: "bg-orange-500" },
      { channel: "Indicação", leadsCount: 70, dealsCount: 9, conversionRate: 12.9, share: 4.9, color: "bg-amber-500" },
    ],
    sellers: [
      { id: "s1", name: "Rafael Alves", avatar: "RA", dealsCount: 94, revenue: 10500000, avgResponseMinutes: 12, conversionRate: 24.1 },
      { id: "s2", name: "Camila Dias", avatar: "CD", dealsCount: 65, revenue: 6100000, avgResponseMinutes: 17, conversionRate: 16.8 },
      { id: "s3", name: "Lucas Santana", avatar: "LS", dealsCount: 38, revenue: 2350000, avgResponseMinutes: 21, conversionRate: 12.2 },
      { id: "s4", name: "Beatriz Rocha", avatar: "BR", dealsCount: 21, revenue: 850000, avgResponseMinutes: 28, conversionRate: 8.9 },
    ],
    topVehicles: [
      { make: "Honda", model: "Civic", version: "EXL 2.0 CVT", unitsSold: 42, totalRevenue: 6295800, avgDaysToSell: 10 },
      { make: "Toyota", model: "Corolla Cross", version: "XRE 2.0", unitsSold: 34, totalRevenue: 5742600, avgDaysToSell: 15 },
      { make: "Jeep", model: "Compass", version: "Longitude 1.3 T", unitsSold: 28, totalRevenue: 3777200, avgDaysToSell: 18 },
    ],
  },
};

// ---------------------------------------------------------------------------
// Componente de Cartão de KPI
// ---------------------------------------------------------------------------

interface KPIStatCardProps {
  label: string;
  value: string;
  growth: string;
  isPositive?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

function KPIStatCard({
  label,
  value,
  growth,
  isPositive = true,
  icon: Icon,
  iconBg,
  iconColor,
}: KPIStatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground truncate">
            {value}
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs">
            {isPositive ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            )}
            <span
              className={cn(
                "font-semibold",
                isPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            >
              {growth}
            </span>
            <span className="text-[10px] text-muted-foreground">vs anterior</span>
          </div>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm",
            iconBg
          )}
        >
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente Principal: ReportsPage
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [isExporting, startExportTransition] = useTransition();
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const { role, sellerName } = useDemoRole();

  const isVendedorRole = role === "vendedor" || role === "seller";
  const currentData = PERIOD_METRICS[period];
  const { kpis, funnel, channels, sellers, topVehicles } = currentData;

  const handleExport = () => {
    startExportTransition(() => {
      // Simula geração e download de relatório
      setTimeout(() => {
        setExportFeedback("Relatório Exportado com Sucesso!");
        setTimeout(() => setExportFeedback(null), 3000);
      }, 400);
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* ------------------------------------------------------------------ */}
      {/* Topo / Header da Página                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                Relatórios e Indicadores
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                <Sparkles className="h-3 w-3" />
                Live
              </span>
              {isVendedorRole && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  <User className="h-3 w-3" />
                  Visão Vendedor ({sellerName})
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isVendedorRole
                ? `Métricas individuais e indicadores do consultor ${sellerName}`
                : "Inteligência comercial, conversão de funil e performance de vendas"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor de Período */}
            <div
              role="tablist"
              aria-label="Filtro de período dos relatórios"
              className="inline-flex rounded-lg border bg-muted/60 p-1 text-xs overflow-x-auto max-w-full"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  id={`period-btn-${opt.id}`}
                  role="tab"
                  aria-selected={period === opt.id}
                  onClick={() => setPeriod(opt.id)}
                  className={cn(
                    "rounded-md px-2.5 py-1 font-medium transition-all",
                    period === opt.id
                      ? "bg-background text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Botão de Exportação */}
            <Button
              id="btn-export-report"
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="gap-1.5 text-xs font-semibold"
              aria-label="Exportar relatório consolidado"
            >
              {exportFeedback ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {exportFeedback}
                  </span>
                </>
              ) : isExporting ? (
                <>
                  <Download className="h-3.5 w-3.5 animate-bounce text-orange-500" />
                  <span>Gerando PDF...</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>Exportar Relatório</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Conteúdo Principal do Dashboard de Analytics                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 space-y-6 p-4 sm:p-6">
        {/* Banner de Restrição RBAC para Perfil Vendedor */}
        {isVendedorRole && (
          <div
            id="banner-rbac-reports"
            className="rounded-xl border border-amber-300/80 bg-amber-50/90 dark:border-amber-900/60 dark:bg-amber-950/40 p-4 text-amber-900 dark:text-amber-200 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-200 dark:bg-amber-900/80 text-amber-800 dark:text-amber-300">
                <Lock className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                  Relatórios Executivos Restritos a Gerentes e Administradores
                  <span className="rounded-full bg-amber-200/80 dark:bg-amber-900/80 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:text-amber-200">
                    Acesso Gestor / Admin
                  </span>
                </h3>
                <p className="mt-1 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  Você está operando sob o perfil de <strong>Vendedor ({sellerName})</strong>. Os indicadores consolidados de faturamento da loja, canais de aquisição e ranking geral são reservados aos gerentes e diretores.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 1. KPIs Executivos */}
        <section aria-label="Métricas Executivas">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KPIStatCard
              label="Faturamento Realizado"
              value={formatCurrency(kpis.revenue)}
              growth={`+${kpis.revenueGrowth}%`}
              isPositive={kpis.revenueGrowth >= 0}
              icon={DollarSign}
              iconBg="bg-emerald-100 dark:bg-emerald-950/60"
              iconColor="text-emerald-600 dark:text-emerald-400"
            />
            <KPIStatCard
              label="Taxa de Conversão Global"
              value={`${kpis.conversionRate}%`}
              growth={`+${kpis.conversionGrowth}%`}
              isPositive={kpis.conversionGrowth >= 0}
              icon={Target}
              iconBg="bg-blue-100 dark:bg-blue-950/60"
              iconColor="text-blue-600 dark:text-blue-400"
            />
            <KPIStatCard
              label="Ticket Médio por Veículo"
              value={formatCurrency(kpis.averageTicket)}
              growth={`+${kpis.ticketGrowth}%`}
              isPositive={kpis.ticketGrowth >= 0}
              icon={Car}
              iconBg="bg-violet-100 dark:bg-violet-950/60"
              iconColor="text-violet-600 dark:text-violet-400"
            />
            <KPIStatCard
              label="Tempo Médio de Resposta (SLA)"
              value={`${kpis.avgResponseMinutes} min`}
              growth={`${kpis.responseDiffMinutes} min`}
              isPositive={true}
              icon={Clock}
              iconBg="bg-amber-100 dark:bg-amber-950/60"
              iconColor="text-amber-600 dark:text-amber-400"
            />
          </div>
        </section>

        {/* 2. Grid Intermediário: Funil de Conversão & Canais de Entrada */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Funil de Conversão Comercial (5 Etapas) */}
          <section
            aria-label="Funil de Conversão Comercial"
            className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm lg:col-span-7"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  Funil de Conversão Comercial
                </h2>
                <p className="text-xs text-muted-foreground">
                  Passagem e retenção de leads entre as 5 etapas da esteira
                </p>
              </div>
              <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                5 Etapas
              </span>
            </div>

            <div className="space-y-3">
              {funnel.map((stage, idx) => (
                <div key={stage.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-100 text-[10px] font-bold text-orange-600 dark:bg-orange-950/80 dark:text-orange-400">
                        {idx + 1}
                      </span>
                      {stage.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">
                        {stage.count} leads
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        ({stage.percentage}%)
                      </span>
                      {idx > 0 && (
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                          {stage.conversionFromPrev}% conv.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Barra de Progresso do Estágio */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500"
                      style={{ width: `${stage.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Eficiência por Canal de Entrada */}
          <section
            aria-label="Eficiência por Canal de Entrada"
            className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm lg:col-span-5 flex flex-col justify-between"
          >
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    Eficiência por Canal
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Origem de leads e taxa de conversão final
                  </p>
                </div>
                <Share2 className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="space-y-3.5">
                {channels.map((chan) => (
                  <div key={chan.channel} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", chan.color)} />
                        <span className="font-medium text-foreground">
                          {chan.channel}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {chan.leadsCount} leads ({chan.dealsCount} vendas)
                        </span>
                        <span className="font-bold text-foreground">
                          {chan.conversionRate}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", chan.color)}
                        style={{ width: `${chan.share}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-muted/50 p-2.5 text-[11px] text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-orange-500 shrink-0" />
              <span>
                <strong>WhatsApp</strong> é o canal com maior taxa de conversão direta.
              </span>
            </div>
          </section>
        </div>

        {/* 3. Grid Inferior: Ranking de Vendedores & Veículos Mais Vendidos */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Ranking de Performance dos Vendedores */}
          <section
            aria-label="Ranking de Performance da Equipe"
            className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm lg:col-span-7"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-orange-500" />
                  Ranking da Equipe Comercial
                </h2>
                <p className="text-xs text-muted-foreground">
                  Performance individual por volume de vendas, faturamento e SLA
                </p>
              </div>
            </div>

            <div className="divide-y">
              {sellers.map((seller, index) => {
                const isTop1 = index === 0;
                return (
                  <div
                    key={seller.id}
                    className={cn(
                      "flex items-center justify-between py-3 transition-colors",
                      isTop1 && "bg-amber-500/5 -mx-2 px-2 rounded-lg"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm",
                            isTop1
                              ? "bg-gradient-to-br from-amber-400 to-orange-500 ring-2 ring-amber-400"
                              : "bg-slate-500"
                          )}
                        >
                          {seller.avatar}
                        </div>
                        {isTop1 && (
                          <span
                            title="Top 1 Campeão de Vendas"
                            className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] shadow"
                          >
                            👑
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-foreground">
                            {seller.name}
                          </p>
                          {isTop1 && (
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                              Top 1
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {seller.dealsCount} vendas concluídas • SLA: {seller.avgResponseMinutes} min
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">
                        {formatCurrency(seller.revenue)}
                      </p>
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        {seller.conversionRate}% conv.
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Veículos Mais Vendidos / Maior Giro */}
          <section
            aria-label="Veículos Mais Vendidos"
            className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm lg:col-span-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-orange-500" />
                  Veículos Mais Vendidos
                </h2>
                <p className="text-xs text-muted-foreground">
                  Modelos líderes em receita e giro no pátio
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {topVehicles.map((car) => (
                <div
                  key={`${car.make}-${car.model}`}
                  className="flex items-center justify-between rounded-lg border bg-muted/30 p-2.5 transition-all hover:bg-muted/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">
                      {car.make} {car.model}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {car.version} • Giro médio: {car.avgDaysToSell} dias
                    </p>
                  </div>
                  <div className="text-right ml-2 shrink-0">
                    <p className="text-xs font-bold text-foreground">
                      {car.unitsSold} {car.unitsSold === 1 ? "unidade" : "unidades"}
                    </p>
                    <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(car.totalRevenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
