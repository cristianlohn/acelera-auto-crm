/**
 * @file page.tsx
 * @description Cockpit Executivo do Gestor ("Dinheiro na Mesa", SLAs de Primeiro Atendimento e Ranking da Roleta).
 */

import React from "react";
import { Users, ChevronRight } from "lucide-react";
import { getManagerCockpitMetrics } from "@/app/actions/cockpit";
import { ManagerActionCockpit } from "@/components/dashboard/ManagerActionCockpit";
import { cn } from "@/lib/utils";
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

      {/* Widget Interativo: Dinheiro na Mesa & Ações Recomendadas */}
      <ManagerActionCockpit metrics={metrics} />

      {/* Tabela de Ranking & Auditoria da Roleta de Vendedores */}
      <div className="rounded-2xl border border-white/10 bg-[#121216] p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-500" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Ranking da Equipe & Auditoria da Roleta
              </h3>
              <p className="text-xs text-zinc-400">
                Acompanhamento individual de tempo de resposta e equilíbrio no rodízio de oportunidades.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3">Vendedor</th>
                <th className="py-3 px-3">Leads Recebidos</th>
                <th className="py-3 px-3">Quota Roleta (%)</th>
                <th className="py-3 px-3">Negócios Ativos</th>
                <th className="py-3 px-3">Vendas Ganhas</th>
                <th className="py-3 px-3">Tempo Médio Resposta</th>
                <th className="py-3 px-3">Status SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {metrics.sellerRanking.map((seller) => (
                <tr key={seller.sellerName} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-3 font-semibold text-white flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-[11px] font-bold text-white flex items-center justify-center shrink-0">
                      {seller.sellerName.slice(0, 2).toUpperCase()}
                    </div>
                    <span>{seller.sellerName}</span>
                  </td>
                  <td className="py-3.5 px-3 font-bold text-white">{seller.leadsCount}</td>
                  <td className="py-3.5 px-3 text-zinc-400">{seller.sharePercentage}%</td>
                  <td className="py-3.5 px-3 text-amber-300 font-semibold">{seller.activeDeals}</td>
                  <td className="py-3.5 px-3 text-emerald-400 font-bold">{seller.wonDeals}</td>
                  <td className="py-3.5 px-3 font-mono">{seller.avgResponseMinutes} min</td>
                  <td className="py-3.5 px-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border",
                        seller.slaBadge === "verde"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : seller.slaBadge === "amarelo"
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          : "bg-red-500/10 border-red-500/30 text-red-400"
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          seller.slaBadge === "verde"
                            ? "bg-emerald-500"
                            : seller.slaBadge === "amarelo"
                            ? "bg-amber-500"
                            : "bg-red-500 animate-pulse"
                        )}
                      />
                      {seller.slaBadge === "verde"
                        ? "Excelente (<10 min)"
                        : seller.slaBadge === "amarelo"
                        ? "Atenção (10-15 min)"
                        : "Crítico (>15 min)"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
