/**
 * @file ManagerActionCockpit.tsx
 * @description Widget Executivo "Dinheiro na Mesa", SLA de Primeiro Atendimento & Exportação de Relatórios.
 *
 * Transforma o CRM de um simples "sistema que registra informações" para um
 * "cockpit que ajuda o gerente a tomar decisões imediatas, salvar propostas em risco e fechar mais vendas".
 *
 * Módulos:
 * 1. Topo com Ações de Exportação (CSV e PDF/Impressão).
 * 2. Cards Executivos de Topo: "Dinheiro na Mesa" com valor em risco, "SLA de Primeiro Atendimento" e "Conversão do Funil".
 * 3. Indicadores de Gargalo em Tempo Real (Leads sem retorno, Propostas paradas, Financiamento, Leads quentes).
 * 4. Painel de Intervenções e Ações Recomendadas por Vendedor com cobrança rápida via WhatsApp.
 */

"use client";

import React, { useState } from "react";
import {
  Flame,
  Clock,
  FileSpreadsheet,
  Banknote,
  Send,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingDown,
  DollarSign,
  Zap,
  Target,
  AlertTriangle,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ManagerCockpitMetrics } from "@/lib/crm/analytics";
import { generateCockpitCSV, downloadCSV } from "@/lib/crm/export-csv";
import { printCockpitReport } from "@/lib/crm/export-pdf";

export interface BottleneckMetric {
  id: string;
  count: number;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  urgency: "critico" | "alto" | "medio" | "info";
}

export interface SellerAction {
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

export const DEFAULT_BOTTLENECK_METRICS: BottleneckMetric[] = [
  {
    id: "sem-retorno",
    count: 12,
    label: "Leads sem retorno",
    description: "Tempo de espera estourado (> 15 min no primeiro contato)",
    icon: Clock,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    urgency: "critico",
  },
  {
    id: "propostas-paradas",
    count: 8,
    label: "Propostas sem follow-up",
    description: "Propostas enviadas há mais de 24h sem novo contato",
    icon: FileSpreadsheet,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    urgency: "alto",
  },
  {
    id: "aguardando-banco",
    count: 5,
    label: "Aguardando financiamento",
    description: "Fichas bancárias pendentes de aprovação na mesa de crédito",
    icon: Banknote,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    urgency: "medio",
  },
  {
    id: "leads-quentes",
    count: 17,
    label: "Leads quentes sem ação hoje",
    description: "Clientes em negociação avançada sem interação nas últimas 8h",
    icon: Flame,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    urgency: "info",
  },
];

export const DEFAULT_SELLER_ACTIONS: SellerAction[] = [
  {
    id: "act-1",
    sellerName: "Rafael Alves",
    avatar: "RA",
    actionText: "4 leads sem retorno imediato",
    leadCount: 4,
    urgencyType: "danger",
    timeText: "Há 42 min",
    defaultMessage:
      "Olá Rafael, identifiquei no Acelera que você possui 4 novos leads aguardando resposta há mais de 15 minutos. Vamos priorizar o contato agora para não esfriar!",
    phone: "5511988887777",
  },
  {
    id: "act-2",
    sellerName: "Juliana Lima",
    avatar: "JL",
    actionText: "2 propostas sem follow-up há 48h",
    leadCount: 2,
    urgencyType: "warning",
    timeText: "Há 2 dias",
    defaultMessage:
      "Oi Juliana, temos 2 propostas de clientes com mais de 48h sem retorno no funil. Consegue fazer um follow-up com eles hoje antes do almoço?",
    phone: "5511977776666",
  },
  {
    id: "act-3",
    sellerName: "Carlos Souza",
    avatar: "CS",
    actionText: "1 lead quente parado há 5 horas",
    leadCount: 1,
    urgencyType: "hot",
    timeText: "Há 5 horas",
    defaultMessage:
      "Fala Carlos! O cliente do Corolla Cross está com visita prevista para o fim de semana mas sem contato há 5h. Dá um toque nele para confirmar!",
    phone: "5511966665555",
  },
];

export const DEMO_RECOMMENDED_ACTIONS: SellerAction[] = [
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
      "Olá Rafael, identifiquei no Acelera que o lead João Ferreira (Webmotors - Jeep Compass Longitude 2023) está aguardando primeiro contato há 22 minutos. Vamos priorizar o retorno agora para não esfriar!",
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
      "Oi Lucas, a ficha da Mariana Albuquerque foi aprovada no Banco BV para o Corolla Cross há 18h. Consegue formalizar e enviar o contrato para fechamento hoje?",
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
      "Camila, o test-drive com Carlos Eduardo no VW Nivus foi concluído ontem e ainda não há proposta registrada no CRM. Vamos fazer esse follow-up!",
    phone: "5511966665555",
  },
];

export const DEFAULT_METRICS: ManagerCockpitMetrics = {
  totalPipelineValue: 2768000,
  valueAtRisk: 285000,
  totalActiveLeads: 21,
  totalLeads: 81,
  averageFirstContactMinutes: 4.2,
  slaComplianceRate: 88,
  overdueLeadsCount: 12,
  wonLeadsCount: 12,
  conversionRate: 14.8,
  sellerRanking: [
    {
      sellerName: "Rafael Alves",
      leadsCount: 19,
      activeDeals: 8,
      wonDeals: 4,
      avgResponseMinutes: 6.0,
      slaBadge: "verde",
      sharePercentage: 35.0,
      pipelineValue: 1050000,
      revenue: 520000,
    },
    {
      sellerName: "Juliana Lima",
      leadsCount: 16,
      activeDeals: 6,
      wonDeals: 5,
      avgResponseMinutes: 4.0,
      slaBadge: "verde",
      sharePercentage: 30.0,
      pipelineValue: 860000,
      revenue: 640000,
    },
    {
      sellerName: "Carlos Souza",
      leadsCount: 18,
      activeDeals: 7,
      wonDeals: 3,
      avgResponseMinutes: 11.0,
      slaBadge: "amarelo",
      sharePercentage: 35.0,
      pipelineValue: 858000,
      revenue: 380000,
    },
  ],
  bottlenecks: {
    withoutReturnCount: 12,
    proposalsWithoutFollowupCount: 8,
    pendingFinancingCount: 5,
    hotLeadsCount: 17,
  },
  recommendedActions: DEFAULT_SELLER_ACTIONS,
};

function formatBrl(val: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(val);
}

import { SellerActionCockpit } from "@/components/dashboard/SellerActionCockpit";
import { useDemoRole } from "@/context/demo-role-context";

export interface ManagerActionCockpitProps {
  className?: string;
  metrics?: ManagerCockpitMetrics;
  dealershipName?: string;
}

export function ManagerActionCockpit({
  className,
  metrics,
  dealershipName = "Concessionária Acelera Auto",
}: ManagerActionCockpitProps) {
  const { role, isDemoMode } = useDemoRole();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [notifiedActions, setNotifiedActions] = useState<Set<string>>(new Set());

  const isVendedor = role === "vendedor" || role === "seller";

  if (isVendedor) {
    return <SellerActionCockpit className={className} metrics={metrics} isDemo={isDemoMode} />;
  }

  const activeMetrics: ManagerCockpitMetrics = isDemoMode
    ? (metrics || DEFAULT_METRICS)
    : (metrics || {
        totalPipelineValue: 0,
        valueAtRisk: 0,
        totalActiveLeads: 0,
        totalLeads: 0,
        averageFirstContactMinutes: 0,
        slaComplianceRate: 100,
        overdueLeadsCount: 0,
        wonLeadsCount: 0,
        conversionRate: 0,
        sellerRanking: [],
        bottlenecks: {
          withoutReturnCount: 0,
          proposalsWithoutFollowupCount: 0,
          pendingFinancingCount: 0,
          hotLeadsCount: 0,
        },
        recommendedActions: [],
      });

  const totalPipeline = activeMetrics.totalPipelineValue;
  const valueAtRisk = activeMetrics.valueAtRisk;
  const avgSlaMinutes = activeMetrics.averageFirstContactMinutes;
  const complianceRate = activeMetrics.slaComplianceRate;
  const overdueCount = activeMetrics.overdueLeadsCount;
  const conversionRate = activeMetrics.conversionRate;
  const wonCount = activeMetrics.wonLeadsCount;

  const actionsList: SellerAction[] = isDemoMode
    ? (metrics?.recommendedActions && metrics.recommendedActions.length > 0
        ? metrics.recommendedActions
        : (activeMetrics.recommendedActions?.length ? activeMetrics.recommendedActions : DEFAULT_SELLER_ACTIONS))
    : (metrics?.recommendedActions || activeMetrics.recommendedActions || []);

  const bottleneckMetrics: BottleneckMetric[] = [
    {
      id: "sem-retorno",
      count: isDemoMode
        ? (activeMetrics.bottlenecks?.withoutReturnCount ?? activeMetrics.overdueLeadsCount ?? 12)
        : (activeMetrics.bottlenecks?.withoutReturnCount ?? activeMetrics.overdueLeadsCount ?? 0),
      label: "Leads sem retorno",
      description: "Tempo de espera estourado (> 15 min no primeiro contato)",
      icon: Clock,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
      urgency: "critico",
    },
    {
      id: "propostas-paradas",
      count: isDemoMode
        ? (activeMetrics.bottlenecks?.proposalsWithoutFollowupCount ?? 8)
        : (activeMetrics.bottlenecks?.proposalsWithoutFollowupCount ?? 0),
      label: "Propostas sem follow-up",
      description: "Propostas enviadas há mais de 24h sem novo contato",
      icon: FileSpreadsheet,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/30",
      urgency: "alto",
    },
    {
      id: "aguardando-banco",
      count: isDemoMode
        ? (activeMetrics.bottlenecks?.pendingFinancingCount ?? 5)
        : (activeMetrics.bottlenecks?.pendingFinancingCount ?? 0),
      label: "Aguardando financiamento",
      description: "Fichas bancárias pendentes de aprovação na mesa de crédito",
      icon: Banknote,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/30",
      urgency: "medio",
    },
    {
      id: "leads-quentes",
      count: isDemoMode
        ? (activeMetrics.bottlenecks?.hotLeadsCount ?? 17)
        : (activeMetrics.bottlenecks?.hotLeadsCount ?? 0),
      label: "Leads quentes sem ação hoje",
      description: "Clientes em negociação avançada sem interação nas últimas 8h",
      icon: Flame,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
      urgency: "info",
    },
  ];

  const handleNotifySeller = (action: SellerAction) => {
    setNotifiedActions((prev) => new Set(prev).add(action.id));
    const encodedMsg = encodeURIComponent(action.defaultMessage);
    const waLink = `https://wa.me/${action.phone}?text=${encodedMsg}`;
    window.open(waLink, "_blank", "noopener,noreferrer");
  };

  const handleExportCSV = () => {
    const csvContent = generateCockpitCSV(activeMetrics, dealershipName);
    const today = new Date().toISOString().split("T")[0];
    downloadCSV(csvContent, `relatorio-performance-equipe-${today}.csv`);
  };

  const handleExportPDF = () => {
    printCockpitReport(activeMetrics, dealershipName);
  };

  return (
    <div
      id="manager-action-cockpit"
      aria-label="Cockpit Dinheiro na Mesa"
      className={cn(
        "rounded-2xl border border-orange-500/30 bg-gradient-to-b from-[#16161c] via-[#121216] to-[#0c0c10] p-4 sm:p-5 shadow-xl shadow-black/40 ring-1 ring-white/10 transition-all",
        className
      )}
    >
      {/* Topo do Card com Título, Botões de Exportação e Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 via-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25">
            <TrendingDown className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                Quem está deixando dinheiro na mesa?
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-400">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                Ação Imediata
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Oportunidades em risco de perda por demora no atendimento ou falta de follow-up.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Botão Exportar CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            data-testid="btn-export-csv"
            className="h-8 gap-1.5 border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-200 hover:text-white"
            aria-label="Exportar CSV"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden xs:inline">Exportar CSV</span>
          </Button>

          {/* Botão Exportar PDF */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            data-testid="btn-export-pdf"
            className="h-8 gap-1.5 border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-200 hover:text-white"
            aria-label="Exportar PDF"
          >
            <Printer className="h-3.5 w-3.5 text-blue-400" />
            <span className="hidden xs:inline">Exportar PDF</span>
          </Button>

          {/* Toggle Expandir / Recolher */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 px-2 text-xs text-zinc-400 hover:text-white"
            aria-label={isExpanded ? "Recolher cockpit" : "Expandir cockpit"}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-5 animate-in fade-in duration-200">
          {/* 1. Grid dos 3 Cards Executivos de Topo */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Card 1: Dinheiro na Mesa */}
            <div
              data-testid="card-dinheiro-na-mesa"
              className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4" />
                    Dinheiro na Mesa (Pipeline)
                  </span>
                </div>
                <p className="mt-2 text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  }).format(totalPipeline || 0)}
                </p>
              </div>
              <div className="mt-3">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-0.5">
                  <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                  ⚠️ {formatBrl(valueAtRisk)} em risco por estouro de SLA
                </span>
              </div>
            </div>

            {/* Card 2: SLA de Primeiro Atendimento */}
            <div
              data-testid="card-sla-atendimento"
              className="rounded-xl border border-orange-500/20 bg-orange-950/20 p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-orange-400 flex items-center gap-1.5">
                    <Zap className="h-4 w-4" />
                    SLA de Primeiro Atendimento
                  </span>
                  <span className="text-xs font-bold text-orange-300">
                    {avgSlaMinutes} min
                  </span>
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {complianceRate}%
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                  <span>Meta: &lt; 15 minutos</span>
                  <span className="font-semibold text-red-400">
                    {overdueCount} {overdueCount === 1 ? "lead aguardando resposta" : "leads aguardando resposta imediata"}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 rounded-full"
                    style={{ width: `${Math.min(100, complianceRate)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card 3: Conversão do Funil */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                    <Target className="h-4 w-4" />
                    Conversão do Funil
                  </span>
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {conversionRate}%
                </div>
              </div>
              <div className="mt-3">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-md px-2 py-0.5">
                  <CheckCircle2 className="h-3 w-3 text-blue-400 shrink-0" />
                  {wonCount} vendas concluídas no período
                </span>
              </div>
            </div>
          </div>

          {/* 2. Grid dos 4 Indicadores de Gargalo */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {bottleneckMetrics.map((metric) => {
              const IconComp = metric.icon;
              return (
                <div
                  key={metric.id}
                  className={cn(
                    "flex flex-col justify-between rounded-xl border p-3 sm:p-3.5 transition-all hover:scale-[1.02]",
                    metric.bgColor,
                    metric.borderColor
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl sm:text-2xl font-black text-white">
                      {metric.count}
                    </span>
                    <IconComp className={cn("h-4 w-4", metric.color)} />
                  </div>
                  <div className="mt-2">
                    <p className={cn("text-xs font-bold leading-tight", metric.color)}>
                      {metric.label}
                    </p>
                    <p className="mt-0.5 text-[10px] text-zinc-400 leading-tight truncate">
                      {metric.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3. Ações Recomendadas para a Equipe */}
          <div className="rounded-xl border border-white/5 bg-black/40 p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-400">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Ações Recomendadas pelo Sistema</span>
              </div>
              <span className="text-[11px] text-zinc-400">
                {actionsList.length} alertas pendentes
              </span>
            </div>

            {actionsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20 p-6 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-white">Nenhuma ação crítica pendente</p>
                <p className="text-[11px] text-zinc-400 mt-0.5 max-w-sm">
                  Excelente! Toda a equipe comercial está atendendo dentro dos SLAs estabelecidos.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {actionsList.map((action) => {
                  const isDone = notifiedActions.has(action.id);
                  return (
                    <div
                      key={action.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-white/5 bg-zinc-900/60 p-2.5 sm:p-3 transition-colors hover:bg-zinc-900/90"
                    >
                      {/* Vendedor e alerta */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-xs font-bold text-white shadow">
                          {action.avatar || action.sellerName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-xs sm:text-sm font-semibold text-white">
                              {action.sellerName}
                            </p>
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[10px] font-bold",
                                action.urgencyType === "danger"
                                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                  : action.urgencyType === "warning"
                                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                                  : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              )}
                            >
                              {action.actionText}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 truncate">
                            {action.defaultMessage}
                          </p>
                        </div>
                      </div>

                      {/* Botão de Cobrança / Ação Rápida */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <span className="text-[10px] font-mono text-zinc-500">
                          {action.timeText}
                        </span>
                        <Button
                          size="sm"
                          variant={isDone ? "outline" : "default"}
                          onClick={() => handleNotifySeller(action)}
                          className={cn(
                            "h-7 gap-1 px-2.5 text-[11px] font-bold transition-all",
                            isDone
                              ? "border-emerald-500/30 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40"
                              : "bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700 shadow-md shadow-orange-500/20"
                          )}
                          aria-label={`Cobrar ${action.sellerName} no WhatsApp`}
                        >
                          {isDone ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                              <span>Cobrado</span>
                            </>
                          ) : (
                            <>
                              <Send className="h-3 w-3" />
                              <span>Cobrar no WhatsApp</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
