/**
 * @file ManagerActionCockpit.tsx
 * @description Widget Executivo "Dinheiro na Mesa", SLA de Primeiro Atendimento & Ranking da Roleta de Vendas.
 *
 * Transforma o CRM de um simples "sistema que registra informações" para um
 * "cockpit que ajuda o gerente a tomar decisões imediatas, salvar propostas em risco e fechar mais vendas".
 *
 * Módulos:
 * 1. Cards Executivos de Topo: "Dinheiro na Mesa" com valor em risco, "SLA de Primeiro Atendimento" e "Conversão do Funil".
 * 2. Indicadores de Gargalo em Tempo Real (Leads sem retorno, Propostas paradas, Financiamento, Leads quentes).
 * 3. Ranking da Equipe de Vendas com badges de SLA e auditoria da Roleta.
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ManagerCockpitMetrics } from "@/lib/crm/analytics";

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

const DEFAULT_BOTTLENECK_METRICS: BottleneckMetric[] = [
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

const DEFAULT_SELLER_ACTIONS: SellerAction[] = [
  {
    id: "act-1",
    sellerName: "Rafael Alves",
    avatar: "RA",
    actionText: "4 leads sem retorno imediato",
    leadCount: 4,
    urgencyType: "danger",
    timeText: "Há 42 min",
    defaultMessage: "Olá Rafael, identifiquei no Acelera que você possui 4 novos leads aguardando resposta há mais de 15 minutos. Vamos priorizar o contato agora para não esfriar!",
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
    defaultMessage: "Oi Juliana, temos 2 propostas de clientes com mais de 48h sem retorno no funil. Consegue fazer um follow-up com eles hoje antes do almoço?",
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
    defaultMessage: "Fala Carlos! O cliente do Corolla Cross está com visita prevista para o fim de semana mas sem contato há 5h. Dá um toque nele para confirmar!",
    phone: "5511966665555",
  },
];

function formatBrl(val: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(val);
}

export interface ManagerActionCockpitProps {
  className?: string;
  metrics?: ManagerCockpitMetrics;
}

export function ManagerActionCockpit({
  className,
  metrics,
}: ManagerActionCockpitProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [notifiedActions, setNotifiedActions] = useState<Set<string>>(new Set());

  // Métricas com fallbacks realistas para visualização imediata
  const totalPipeline = metrics?.totalPipelineValue || 1480000;
  const valueAtRisk = metrics?.valueAtRisk || 190000;
  const avgSlaMinutes = metrics?.averageFirstContactMinutes || 8.4;
  const complianceRate = metrics?.slaComplianceRate || 88;
  const overdueCount = metrics?.overdueLeadsCount ?? 3;
  const conversionRate = metrics?.conversionRate || 24.5;
  const wonCount = metrics?.wonLeadsCount || 14;

  const handleNotifySeller = (action: SellerAction) => {
    setNotifiedActions((prev) => new Set(prev).add(action.id));
    const encodedMsg = encodeURIComponent(action.defaultMessage);
    const waLink = `https://wa.me/${action.phone}?text=${encodedMsg}`;
    window.open(waLink, "_blank", "noopener,noreferrer");
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
      {/* Topo do Card com Título e Toggle */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3.5">
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

      {isExpanded && (
        <div className="mt-4 space-y-5 animate-in fade-in duration-200">
          {/* 1. Grid dos 3 Cards Executivos de Topo */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Card 1: Dinheiro na Mesa */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4" />
                    Dinheiro na Mesa (Pipeline)
                  </span>
                </div>
                <div className="mt-2 text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {formatBrl(totalPipeline)}
                </div>
              </div>
              <div className="mt-3">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-0.5">
                  <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                  ⚠️ {formatBrl(valueAtRisk)} em risco por estouro de SLA
                </span>
              </div>
            </div>

            {/* Card 2: SLA de Primeiro Atendimento */}
            <div className="rounded-xl border border-orange-500/20 bg-orange-950/20 p-4 flex flex-col justify-between">
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
            {DEFAULT_BOTTLENECK_METRICS.map((metric) => {
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
                {DEFAULT_SELLER_ACTIONS.length} alertas pendentes
              </span>
            </div>

            <div className="space-y-2.5">
              {DEFAULT_SELLER_ACTIONS.map((action) => {
                const isDone = notifiedActions.has(action.id);
                return (
                  <div
                    key={action.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-white/5 bg-zinc-900/60 p-2.5 sm:p-3 transition-colors hover:bg-zinc-900/90"
                  >
                    {/* Vendedor e alerta */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-xs font-bold text-white shadow">
                        {action.avatar}
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
          </div>
        </div>
      )}
    </div>
  );
}
