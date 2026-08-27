/**
 * @file page.tsx
 * @description Cockpit Executivo do Gestor ("Dinheiro na Mesa", SLAs de Primeiro Atendimento e Ranking da Roleta).
 */

import React from "react";
import { ChevronRight } from "lucide-react";
import { getManagerCockpitMetrics } from "@/app/actions/cockpit";
import { ManagerActionCockpit } from "@/components/dashboard/ManagerActionCockpit";
import { TeamPerformanceTable } from "@/components/dashboard/team-performance-table";
import Link from "next/link";

export default async function ManagerDashboardPage() {
  const metrics = await getManagerCockpitMetrics();

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Cabeçalho Executivo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Cockpit do Gestor
            </h1>
            <span className="rounded-full bg-orange-500/20 border border-orange-500/30 px-2.5 py-0.5 text-xs font-bold text-orange-400">
              Visão Executiva
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Monitoramento em tempo real de pipeline comercial, estouro de SLAs e distribuição da Roleta.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/leads"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-2 text-xs font-bold text-white transition-all shadow-sm"
          >
            <span>Abrir Funil Kanban</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Widget Interativo: Dinheiro na Mesa, SLAs & Ações Recomendadas */}
      <ManagerActionCockpit metrics={metrics} />

      {/* Tabela de Ranking da Equipe & Adição Rápida de Vendedores */}
      <TeamPerformanceTable initialSellers={metrics.sellerRanking} />
    </div>
  );
}
