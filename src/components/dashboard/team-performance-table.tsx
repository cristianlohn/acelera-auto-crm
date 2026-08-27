/**
 * @file team-performance-table.tsx
 * @description Tabela Executiva de Performance da Equipe & Auditoria da Roleta de Vendas com Ação Rápida de Adição de Vendedor.
 */

"use client";

import React, { useState } from "react";
import { Users, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SellerPerformanceMetric } from "@/lib/crm/analytics";
import { SalespersonModal } from "@/components/team/salesperson-modal";
import type { SalespersonMember } from "@/lib/team-schema";

import { useDemoRole } from "@/context/demo-role-context";

export interface TeamPerformanceTableProps {
  initialSellers: SellerPerformanceMetric[];
}

export function TeamPerformanceTable({
  initialSellers,
}: TeamPerformanceTableProps) {
  const { role } = useDemoRole();
  const [sellers, setSellers] = useState<SellerPerformanceMetric[]>(initialSellers);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isVendedor = role === "vendedor" || role === "seller";
  if (isVendedor) {
    return null;
  }

  const handleSalespersonAdded = (newMember: SalespersonMember) => {
    // Adiciona o novo vendedor dinamicamente na visualização da tabela
    const newSellerMetric: SellerPerformanceMetric = {
      sellerName: newMember.name,
      leadsCount: 0,
      activeDeals: 0,
      wonDeals: 0,
      avgResponseMinutes: 0.0,
      slaBadge: "verde",
      sharePercentage: 0.0,
    };

    setSellers((prev) => [newSellerMetric, ...prev]);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#121216] p-5 shadow-xl">
      {/* Cabeçalho da Tabela e Botão de Adição Rápida */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              Ranking da Equipe & Auditoria da Roleta
              <span className="text-[11px] font-normal text-zinc-400">
                ({sellers.length} vendedores ativos)
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Acompanhamento individual de tempo de resposta e equilíbrio no rodízio de oportunidades.
            </p>
          </div>
        </div>

        {/* Ações da Tabela */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Button
            asChild
            variant="ghost"
            className="h-8 px-3 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10"
          >
            <a href="/dashboard/team" data-testid="btn-manage-full-team">
              Gerenciar Equipe Completa
            </a>
          </Button>

          {/* Botão [+ Adicionar Vendedor] */}
          <Button
            onClick={() => setIsModalOpen(true)}
            data-testid="btn-open-add-salesperson"
            className="h-8 px-3 text-xs font-bold bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-md shadow-orange-500/20 gap-1.5"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Adicionar Vendedor</span>
          </Button>
        </div>
      </div>

      {/* Tabela de Vendedores */}
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
            {sellers.map((seller) => (
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
                <td className="py-3.5 px-3 font-mono">
                  {seller.avgResponseMinutes > 0 ? `${seller.avgResponseMinutes} min` : "Aguardando leads"}
                </td>
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

      {/* Modal de Cadastro de Vendedor */}
      <SalespersonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSalespersonAdded}
      />
    </div>
  );
}
