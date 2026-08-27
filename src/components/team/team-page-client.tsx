/**
 * @file team-page-client.tsx
 * @description Componente Client interativo para a página de Gestão de Equipe e Roleta de Vendas.
 */

"use client";

import React, { useState } from "react";
import { UserPlus, Sparkles, ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamSummaryCards } from "@/components/team/team-summary-cards";
import { TeamTable } from "@/components/team/team-table";
import { SalespersonModal } from "@/components/team/salesperson-modal";
import type { TeamMember, TeamSummaryMetrics } from "@/types/team";
import Link from "next/link";

export interface TeamPageClientProps {
  initialMembers: TeamMember[];
  initialMetrics: TeamSummaryMetrics;
}

export function TeamPageClient({
  initialMembers,
  initialMetrics,
}: TeamPageClientProps) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [metrics, setMetrics] = useState<TeamSummaryMetrics>(initialMetrics);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const handleOpenAddModal = () => {
    setSelectedMember(null);
    setIsModalOpen(true);
  };

  const handleEditMember = (member: TeamMember) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  const handleSalespersonSaved = (savedMember: TeamMember) => {
    setMembers((prev) => {
      const exists = prev.some((m) => m.id === savedMember.id);
      let updated: TeamMember[];
      if (exists) {
        updated = prev.map((m) => (m.id === savedMember.id ? savedMember : m));
      } else {
        updated = [savedMember, ...prev];
      }

      // Recalcula métricas rápidas
      const totalMembers = updated.length;
      const activeInRoulette = updated.filter((m) => m.in_roulette && m.status === "active").length;
      const totalMonthlyGoal = updated.reduce((acc, m) => acc + (m.monthly_goal_units || 0), 0);
      const totalCurrentSales = updated.reduce((acc, m) => acc + (m.current_sales_units || 0), 0);
      const totalSla = updated.reduce((acc, m) => acc + (m.avg_sla_minutes || 0), 0);
      const teamAvgSlaMinutes = totalMembers > 0 ? Number((totalSla / totalMembers).toFixed(1)) : 0;
      const goalCompletionPercentage =
        totalMonthlyGoal > 0 ? Math.min(100, Math.round((totalCurrentSales / totalMonthlyGoal) * 100)) : 0;

      setMetrics({
        totalMembers,
        activeInRoulette,
        totalMonthlyGoal,
        totalCurrentSales,
        teamAvgSlaMinutes,
        goalCompletionPercentage,
      });

      return updated;
    });
  };

  const handleMemberDeleted = (memberId: string) => {
    setMembers((prev) => {
      const updated = prev.filter((m) => m.id !== memberId);
      const totalMembers = updated.length;
      const activeInRoulette = updated.filter((m) => m.in_roulette && m.status === "active").length;
      const totalMonthlyGoal = updated.reduce((acc, m) => acc + (m.monthly_goal_units || 0), 0);
      const totalCurrentSales = updated.reduce((acc, m) => acc + (m.current_sales_units || 0), 0);
      const totalSla = updated.reduce((acc, m) => acc + (m.avg_sla_minutes || 0), 0);
      const teamAvgSlaMinutes = totalMembers > 0 ? Number((totalSla / totalMembers).toFixed(1)) : 0;
      const goalCompletionPercentage =
        totalMonthlyGoal > 0 ? Math.min(100, Math.round((totalCurrentSales / totalMonthlyGoal) * 100)) : 0;

      setMetrics({
        totalMembers,
        activeInRoulette,
        totalMonthlyGoal,
        totalCurrentSales,
        teamAvgSlaMinutes,
        goalCompletionPercentage,
      });

      return updated;
    });
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Breadcrumb & Cabeçalho */}
      <div className="space-y-3 border-b border-white/10 pb-5">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Link href="/dashboard" className="hover:text-white transition-colors flex items-center gap-1">
            <Home className="h-3.5 w-3.5" />
            <span>Início</span>
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
          <span className="text-zinc-200 font-semibold">Gestão de Equipe & Roleta</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Equipe de Vendas & Roleta Comercial
              </h1>
              <span className="rounded-full bg-orange-500/20 border border-orange-500/30 px-2.5 py-0.5 text-xs font-bold text-orange-400">
                Gestão & Distribuição
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Cadastre vendedores, defina metas de conversão e configure o rodízio automático de leads da concessionária.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
            {/* Botão Primário [+ Novo Vendedor] */}
            <Button
              onClick={handleOpenAddModal}
              data-testid="btn-add-salesperson-page"
              className="h-9 px-4 text-xs font-bold bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-500/20 gap-2"
            >
              <UserPlus className="h-4 w-4" />
              <span>Novo Vendedor</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <TeamSummaryCards metrics={metrics} />

      {/* Tabela de Vendedores ou Empty State */}
      {members.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#121216] p-12 text-center shadow-xl space-y-4">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Nenhum vendedor cadastrado ainda</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Cadastre o primeiro membro da sua equipe para habilitar a distribuição automática de leads pela Roleta.
            </p>
          </div>
          <Button
            onClick={handleOpenAddModal}
            data-testid="btn-add-first-salesperson"
            className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold h-9 px-4"
          >
            Cadastrar Primeiro Vendedor
          </Button>
        </div>
      ) : (
        <TeamTable
          members={members}
          onEditMember={handleEditMember}
          onMemberDeleted={handleMemberDeleted}
        />
      )}

      {/* Modal de Cadastro / Edição */}
      <SalespersonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSalespersonSaved}
        initialData={selectedMember}
      />
    </div>
  );
}
