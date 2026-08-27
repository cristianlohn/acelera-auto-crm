/**
 * @file page.tsx  –  /dashboard/leads
 * @description Página Executiva do Funil de Vendas e Quadro Kanban Interativo de Leads.
 */

import React, { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import {
  LayoutDashboard,
  ChevronRight,
  TrendingUp,
  Flame,
} from "lucide-react";
import { getKanbanLeadsAction } from "@/app/actions/kanban-actions";
import { KanbanBoard } from "@/components/kanban/kanban-board";

export const metadata: Metadata = {
  title: "Funil de Vendas & Kanban de Leads | Acelera Auto CRM",
  description:
    "Quadro Kanban executivo com movimentação interativa de leads, cronômetro de SLA em tempo real e controle de pipeline.",
};

export default async function DashboardLeadsPage() {
  const leads = await getKanbanLeadsAction();

  // Métricas rápidas de conversão
  const totalLeads = leads.length;
  const inNegotiation = leads.filter(
    (l) => l.stage === "visit_scheduled" || l.stage === "test_drive" || l.stage === "proposal_fi"
  ).length;
  const wonLeads = leads.filter((l) => l.stage === "won").length;
  const conversionRate =
    totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho Executivo e Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1.5">
            <Link
              href="/dashboard"
              className="hover:text-white transition-colors"
            >
              Cockpit
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-orange-500 font-semibold">Funil de Vendas</span>
          </nav>

          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl flex items-center gap-2.5">
            <LayoutDashboard className="h-7 w-7 text-orange-500" />
            <span>Funil de Vendas & Kanban</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Acompanhe o ciclo de atendimento dos leads em tempo real, priorize negociações críticas e avance estágios com facilidade.
          </p>
        </div>

        {/* Badges de Performance Rápida */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-2xl bg-zinc-900/90 border border-white/10 px-3.5 py-2">
            <Flame className="h-4 w-4 text-orange-400" />
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">
                Em Negociação
              </div>
              <div className="text-sm font-bold text-white">
                {inNegotiation} leads
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-zinc-900/90 border border-white/10 px-3.5 py-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">
                Taxa Conversão
              </div>
              <div className="text-sm font-bold text-emerald-400">
                {conversionRate}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quadro Kanban Interativo */}
      <Suspense
        fallback={
          <div className="flex h-96 items-center justify-center rounded-3xl border border-white/10 bg-zinc-950/40 text-sm text-zinc-400">
            Carregando Quadro Kanban de Leads...
          </div>
        }
      >
        <KanbanBoard initialLeads={leads} />
      </Suspense>
    </div>
  );
}
