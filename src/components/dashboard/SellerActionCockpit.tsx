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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ManagerCockpitMetrics } from "@/lib/crm/analytics";
import { useDemoRole } from "@/context/demo-role-context";

export interface SellerActionCockpitProps {
  className?: string;
  metrics?: ManagerCockpitMetrics;
}

export function SellerActionCockpit({
  className,
}: SellerActionCockpitProps) {
  const { sellerName } = useDemoRole();
  const [isExpanded, setIsExpanded] = useState(true);
  const [notifiedActions, setNotifiedActions] = useState<Set<string>>(new Set());

  // Métricas do vendedor (Rafael Alves ou vendedor logado)
  const myPendingLeadsCount = 4;
  const myPendingPipelineValue = 680000;
  const myMonthlyWonDeals = 6;
  const myMonthlyRevenue = 420000;
  const myAverageSlaMinutes = 6.2;
  const mySlaComplianceRate = 94;

  // Ações e alertas estritamente do próprio vendedor
  const myActions = [
    {
      id: "seller-act-1",
      leadName: "Carlos Mendonça",
      vehicle: "Honda Civic EXL 2023",
      actionText: "Aguardando 1º contato há 18 min",
      timeText: "Há 18 min",
      urgency: "critico" as const,
      phone: "5511987654321",
      defaultMessage:
        "Olá Carlos, tudo bem? Sou o Rafael da Acelera Auto. Vi seu interesse no Honda Civic EXL 2023. Como posso te ajudar hoje?",
    },
    {
      id: "seller-act-2",
      leadName: "Patrícia Vieira",
      vehicle: "Renault Kwid Intense",
      actionText: "Proposta de financiamento enviada há 4h",
      timeText: "Há 4h",
      urgency: "medio" as const,
      phone: "5591889765432",
      defaultMessage:
        "Oi Patrícia! Passando para checar se você conseguiu analisar a simulação de parcelas do Kwid. Quer que eu ajuste a entrada?",
    },
    {
      id: "seller-act-3",
      leadName: "Mariana Souza",
      vehicle: "Corolla Cross XRE",
      actionText: "Cliente compradora com interesse em troca",
      timeText: "Há 1 dia",
      urgency: "info" as const,
      phone: "5547998877665",
      defaultMessage:
        "Olá Mariana! Chegou uma nova unidade de Corolla Cross com condições exclusivas de avaliação do seu seminovo. Vamos agendar uma visita?",
    },
  ];

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
                {sellerName || "Rafael Alves"}
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
          </div>
        </div>
      )}
    </div>
  );
}
