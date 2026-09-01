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
import Link from "next/link";
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
import { normalizeRole, canViewExecutiveReports } from "@/lib/permissions";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import type {
  ReportPeriod,
  PeriodOption,
  KPIStats,
  FunnelStageData,
  ChannelPerformance,
  SellerPerformance,
  TopVehicle,
  ExecutiveReportData,
} from "@/lib/reports/types";
import { PERIOD_OPTIONS, PERIOD_METRICS, EMPTY_METRICS } from "@/lib/reports/fixtures";
import { useExecutiveReports } from "@/hooks/use-reports";

export type {
  ReportPeriod,
  PeriodOption,
  KPIStats,
  FunnelStageData,
  ChannelPerformance,
  SellerPerformance,
  TopVehicle,
  ExecutiveReportData,
};
export { PERIOD_OPTIONS, PERIOD_METRICS, EMPTY_METRICS };

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

function ReportsPageContent() {
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [isExporting, startExportTransition] = useTransition();
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const { role, sellerName, isDemoMode } = useDemoRole();
  const effectiveRole = normalizeRole(role);
  const isVendedorRole = effectiveRole === "seller";
  const canViewReports = canViewExecutiveReports(effectiveRole);

  // Consumo Dual-Engine com TanStack Query v5
  const { data: reportData, isLoading } = useExecutiveReports(
    period,
    isDemoMode,
    isDemoMode ? PERIOD_METRICS[period] : undefined
  );

  if (!isDemoMode && !canViewReports) {
    return (
      <div className="flex h-[calc(100vh-80px)] flex-col items-center justify-center p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-4">
          <Lock className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Acesso Restrito</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Os relatórios executivos e indicadores consolidados de faturamento são exclusivos para Gerentes e Administradores da concessionária.
        </p>
        <div className="mt-6 flex gap-3">
          <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white">
            <Link href="/leads">Voltar para o Funil de Leads</Link>
          </Button>
        </div>
      </div>
    );
  }

  const currentData = reportData || (isDemoMode ? PERIOD_METRICS[period] : EMPTY_METRICS);
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

              {channels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <Share2 className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs font-semibold text-foreground">
                    Nenhum dado registrado neste período
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
                    Origens de tráfego e canais de conversão aparecerão aqui à medida que novos leads forem recebidos.
                  </p>
                </div>
              ) : (
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
              )}
            </div>

            {channels.length > 0 && (
              <div className="mt-4 rounded-lg bg-muted/50 p-2.5 text-[11px] text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                <span>
                  <strong>WhatsApp</strong> é o canal com maior taxa de conversão direta.
                </span>
              </div>
            )}
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

            {sellers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground rounded-lg border border-dashed border-border/60 bg-muted/20">
                <Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs font-semibold text-foreground">
                  Nenhum vendedor com vendas concluídas no período
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
                  Os consultores com negociações ganhas na esteira comercial serão ranqueados aqui.
                </p>
              </div>
            ) : (
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
            )}
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

            {topVehicles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground rounded-lg border border-dashed border-border/60 bg-muted/20">
                <Layers className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs font-semibold text-foreground">
                  Nenhum veículo vendido no período
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
                  Os modelos com maior volume de faturamento e giro de estoque aparecerão aqui.
                </p>
              </div>
            ) : (
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
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  let hasQueryClient = true;
  try {
    useQueryClient();
  } catch {
    hasQueryClient = false;
  }

  if (!hasQueryClient) {
    const [fallbackQueryClient] = useState(
      () =>
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
          },
        })
    );
    return (
      <QueryClientProvider client={fallbackQueryClient}>
        <ReportsPageContent />
      </QueryClientProvider>
    );
  }

  return <ReportsPageContent />;
}

