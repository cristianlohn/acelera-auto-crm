/**
 * @file team-summary-cards.tsx
 * @description Cards executivos com indicadores de equipe, plantão da roleta e metas de vendas.
 */

"use client";

import React from "react";
import { Users, Sparkles, Target, Zap } from "lucide-react";
import type { TeamSummaryMetrics } from "@/types/team";

export interface TeamSummaryCardsProps {
  metrics: TeamSummaryMetrics;
}

export function TeamSummaryCards({ metrics }: TeamSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: Total de Vendedores */}
      <div
        data-testid="card-total-salespeople"
        className="rounded-2xl border border-white/10 bg-[#121216] p-5 shadow-lg relative overflow-hidden group hover:border-white/20 transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Total de Vendedores
          </span>
          <div className="h-9 w-9 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
            <Users className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {metrics.totalMembers}
          </span>
          <span className="text-xs text-zinc-400">membros cadastrados</span>
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">
          Equipe comercial ativa na organização
        </p>
      </div>

      {/* Card 2: Em Plantão / Roleta Ativa */}
      <div
        data-testid="card-active-roulette"
        className="rounded-2xl border border-orange-500/20 bg-gradient-to-b from-[#18120e] to-[#121216] p-5 shadow-lg relative overflow-hidden group hover:border-orange-500/30 transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-orange-300 uppercase tracking-wider">
            Em Plantão Agora
          </span>
          <div className="h-9 w-9 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-orange-400 tracking-tight">
            {metrics.activeInRoulette}
          </span>
          <span className="text-xs text-orange-300/80">na Roleta</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Distribuição automática ativa</span>
        </div>
      </div>

      {/* Card 3: Meta da Loja */}
      <div
        data-testid="card-team-goal"
        className="rounded-2xl border border-white/10 bg-[#121216] p-5 shadow-lg relative overflow-hidden group hover:border-white/20 transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Meta da Loja
          </span>
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Target className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {metrics.totalCurrentSales}
            <span className="text-sm font-semibold text-zinc-500">
              /{metrics.totalMonthlyGoal} un
            </span>
          </span>
        </div>
        {/* Barra de Progresso */}
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-[11px] text-zinc-400">
            <span>Progresso da Equipe</span>
            <span className="font-bold text-emerald-400">
              {metrics.goalCompletionPercentage}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${metrics.goalCompletionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Card 4: SLA Médio da Equipe */}
      <div
        data-testid="card-team-sla"
        className="rounded-2xl border border-white/10 bg-[#121216] p-5 shadow-lg relative overflow-hidden group hover:border-white/20 transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            SLA Médio
          </span>
          <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <Zap className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
            {metrics.teamAvgSlaMinutes > 0 ? `${metrics.teamAvgSlaMinutes} min` : "< 5 min"}
          </span>
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">
          Tempo médio do 1º contato via WhatsApp
        </p>
      </div>
    </div>
  );
}
