/**
 * @file page.tsx
 * @description Gestão de Equipe Comercial, Vendedores e Configurações da Roleta de Leads.
 */

import React from "react";
import { Sparkles } from "lucide-react";
import { getSalespeopleAction } from "@/app/actions/team-actions";
import { getManagerCockpitMetrics } from "@/app/actions/cockpit";
import { TeamPerformanceTable } from "@/components/dashboard/team-performance-table";

export default async function TeamManagementPage() {
  const [salespeople, metrics] = await Promise.all([
    getSalespeopleAction(),
    getManagerCockpitMetrics(),
  ]);

  const rouletteCount = salespeople.filter((s) => s.inRoulette).length;

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Equipe de Vendas & Roleta de Leads
            </h1>
            <span className="rounded-full bg-orange-500/20 border border-orange-500/30 px-2.5 py-0.5 text-xs font-bold text-orange-400">
              Gestão Comercial
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Cadastre novos vendedores, defina cotas de distribuição da roleta e acompanhe o desempenho individual.
          </p>
        </div>

        {/* Resumo da Roleta */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2 self-start sm:self-auto">
          <div className="h-8 w-8 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
              Roleta Ativa
            </div>
            <div className="text-xs font-black text-white">
              {rouletteCount} vendedores no rodízio
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Vendedores & Adição Rápida */}
      <TeamPerformanceTable initialSellers={metrics.sellerRanking} />
    </div>
  );
}
