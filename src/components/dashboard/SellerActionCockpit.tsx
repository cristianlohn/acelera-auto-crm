/**
 * @file SellerActionCockpit.tsx
 * @description Cockpit Operacional Individual do Vendedor.
 *
 * Exibe métricas operacionais exclusivas do vendedor ativo:
 * 1. Meus Leads Pendentes de Resposta
 * 2. Minhas Vendas do Mês
 * 3. Meu SLA Pessoal
 * 4. Alertas e Ações Recomendadas exclusivos do próprio vendedor (zero vazamento de outros vendedores).
 */

"use client";

import React, { useState } from "react";
import {
  Clock,
  CheckCircle2,
  TrendingUp,
  Flame,
  Zap,
  Target,
  User,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Car,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ManagerCockpitMetrics } from "@/lib/crm/analytics";
import { useDemoRole } from "@/context/demo-role-context";

export interface SellerActionCockpitProps {
  className?: string;
  metrics?: ManagerCockpitMetrics;
  sellerName?: string;
  isDemo?: boolean;
}

export function SellerActionCockpit({
  className,
  metrics,
  sellerName: propSellerName,
  isDemo: propIsDemo,
}: SellerActionCockpitProps) {
  const { sellerName: demoSellerName, isDemoMode } = useDemoRole();
  const isDemo = propIsDemo !== undefined ? propIsDemo : isDemoMode;
  const [isExpanded, setIsExpanded] = useState(true);
  const [notifiedActions, setNotifiedActions] = useState<Set<string>>(new Set());

  const activeSellerName = isDemo
    ? (propSellerName || demoSellerName || "Rafael Alves")
    : (propSellerName && propSellerName !== "Roberto Silva" && propSellerName !== "Rafael Alves"
        ? propSellerName
        : "Vendedor");

  const sellerMetric = metrics?.sellerRanking.find(
    (s) => s.sellerName.toLowerCase().trim() === activeSellerName.toLowerCase().trim()
  );

  // Conexão dos KPIs com métricas do vendedor ou fallback simulado de demo
  const myPendingLeadsCount = sellerMetric?.activeDeals ?? (isDemo ? 12 : 0);
  const myPendingPipelineValue = sellerMetric?.pipelineValue ?? (isDemo ? 1480000 : 0);
  const myMonthlyWonDeals = sellerMetric?.wonDeals ?? (isDemo ? 4 : 0);
  const myMonthlyRevenue = sellerMetric?.revenue ?? (isDemo ? 480000 : 0);
  const myAverageSlaMinutes = sellerMetric?.avgResponseMinutes ?? (isDemo ? 6.0 : 0.0);
  const mySlaComplianceRate = sellerMetric
    ? (sellerMetric.avgResponseMinutes <= 15 ? 94 : 50)
    : (isDemo ? 94 : 100);

  // Ações e alertas: apenas no modo de demonstração
  const myActions: {
    id: string;
    leadName: string;
    vehicle: string;
    actionText: string;
    timeText: string;
    urgency: "critico" | "medio" | "info";
    phone: string;
    defaultMessage: string;
  }[] = isDemo
    ? [
        {
          id: "seller-act-1",
          leadName: "João Ferreira",
          vehicle: "Jeep Compass Longitude 2023",
          actionText: "Aguardando 1º contato há 22 min",
          timeText: "Há 22 min",
          urgency: "critico" as const,
          phone: "5511988887777",
          defaultMessage:
            "Olá João Ferreira! Sou o consultor Rafael Alves da concessionária. Vi seu interesse no Jeep Compass Longitude 2023. Como posso te auxiliar?",
        },
        {
          id: "seller-act-2",
          leadName: "Thiago Ribeiro",
          vehicle: "Chevrolet Tracker Premier 2023",
          actionText: "Ficha bancária em análise no Banco Santander",
          timeText: "Há 3h",
          urgency: "medio" as const,
          phone: "5511977773333",
          defaultMessage:
            "Oi Thiago! Rafael aqui. Sua ficha da Tracker Premier já está na mesa de crédito do Santander. Assim que liberar te aviso de imediato!",
        },
        {
          id: "seller-act-3",
          leadName: "Carlos Mendonça",
          vehicle: "Honda Civic EXL 2023",
          actionText: "Interesse confirmado aguardando proposta",
          timeText: "Há 5h",
          urgency: "info" as const,
          phone: "5511987654321",
          defaultMessage:
            "Olá Carlos! Rafael da concessionária. Consegui uma condição especial na avaliação do seu usado na troca pelo Civic EXL 2023. Podemos alinhar?",
        },
      ]
    : [];

  const handleContactLead = (actionId: string, phone: string, message: string) => {
    setNotifiedActions((prev) => new Set(prev).add(actionId));
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      id="seller-action-cockpit"
      aria-label="Cockpit Individual do Vendedor"
      className={cn(
        "rounded-2xl border border-orange-500/30 bg-gradient-to-b from-[#16161c] via-[#121216] to-[#0c0c10] p-4 sm:p-5 shadow-xl shadow-black/40 ring-1 ring-white/10 transition-all",
        className
      )}
    >
      {/* Topo do Cockpit do Vendedor */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                Meu Cockpit de Vendas
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 border border-blue-500/30 px-2.5 py-0.5 text-[10px] font-bold text-blue-400">
                <User className="h-3 w-3" />
                {activeSellerName}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Acompanhe seus leads pendentes, tempo de resposta pessoal e metas de fechamento do mês.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 gap-1 border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 hover:text-white"
            aria-label={isExpanded ? "Recolher painel" : "Expandir painel"}
          >
            {isExpanded ? (
              <>
                <span>Recolher</span>
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                <span>Expandir</span>
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-5">
          {/* 3 Widgets Operacionais Individuais */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Widget 1: Meus Leads Pendentes de Resposta */}
            <div className="relative overflow-hidden rounded-xl border border-red-500/30 bg-red-500/5 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-red-300">
                  Meus Leads Pendentes de Resposta
                </span>
                <Clock className="h-4 w-4 text-red-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {myPendingLeadsCount}
                </span>
                <span className="text-xs font-medium text-red-300">
                  aguardando retorno
                </span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                Total em negociação: <strong className="text-zinc-200">R$ {myPendingPipelineValue.toLocaleString("pt-BR")}</strong>
              </p>
            </div>

            {/* Widget 2: Minhas Vendas do Mês */}
            <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-300">
                  Minhas Vendas do Mês
                </span>
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {myMonthlyWonDeals}
                </span>
                <span className="text-xs font-medium text-emerald-300">
                  veículos vendidos
                </span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                Faturamento gerado: <strong className="text-emerald-400">R$ {myMonthlyRevenue.toLocaleString("pt-BR")}</strong>
              </p>
            </div>

            {/* Widget 3: Meu SLA Pessoal */}
            <div className="relative overflow-hidden rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-300">
                  Meu SLA Pessoal
                </span>
                <Target className="h-4 w-4 text-blue-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {myAverageSlaMinutes} min
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Meta &lt; 15 min
                </span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                Taxa de cumprimento: <strong className="text-zinc-200">{mySlaComplianceRate}% dos leads</strong>
              </p>
            </div>
          </div>

          {/* Seção de Atendimentos Prioritários do Vendedor */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Minhas Oportunidades Prioritárias para Contato
                </h3>
              </div>
              <span className="text-[11px] text-zinc-400">
                {myActions.length} contatos pendentes
              </span>
            </div>

            {myActions.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700/60 bg-slate-900/30 p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-3">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-white">Nenhum atendimento pendente</h4>
                <p className="mt-1 max-w-sm text-xs text-zinc-400">
                  Parabéns! Todos os seus contatos foram respondidos dentro do SLA de atendimento. Novos leads distribuídos pela roleta aparecerão aqui instantaneamente.
                </p>
                <Link href="/leads" className="mt-3.5">
                  <Button
                    size="sm"
                    className="h-7 text-xs font-semibold bg-white/10 hover:bg-white/15 text-zinc-200 border border-white/10"
                  >
                    Ver Funil de Vendas
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {myActions.map((action) => {
                  const isNotified = notifiedActions.has(action.id);
                  return (
                    <div
                      key={action.id}
                      className="flex flex-col justify-between rounded-lg border border-white/10 bg-[#16161c]/80 p-3 hover:border-orange-500/40 transition-all shadow-sm"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-white">
                            {action.leadName}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[9px] font-bold",
                              action.urgency === "critico"
                                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                : action.urgency === "medio"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            )}
                          >
                            {action.timeText}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-300">
                          <Car className="h-3 w-3 text-orange-400" />
                          <span>{action.vehicle}</span>
                        </div>
                        <p className="mt-1.5 text-[11px] text-zinc-400">
                          {action.actionText}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-white/5">
                        <Button
                          size="sm"
                          onClick={() =>
                            handleContactLead(
                              action.id,
                              action.phone,
                              action.defaultMessage
                            )
                          }
                          className={cn(
                            "w-full h-7 gap-1.5 text-[11px] font-bold text-white transition-all shadow-sm",
                            isNotified
                              ? "bg-emerald-600 hover:bg-emerald-700"
                              : "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500"
                          )}
                          aria-label={`Chamar ${action.leadName} no WhatsApp`}
                        >
                          {isNotified ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Mensagem Aberta</span>
                            </>
                          ) : (
                            <>
                              <MessageCircle className="h-3.5 w-3.5" />
                              <span>Chamar no WhatsApp</span>
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
