/**
 * @file dashboard-page-client.tsx
 * @description Componente cliente do Cockpit que renderiza dinamicamente a Visão do Vendedor ou Visão do Gestor (RBAC estrito).
 */

"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, LayoutDashboard, UserCheck, Shield } from "lucide-react";
import { useDemoRole } from "@/context/demo-role-context";
import { normalizeRole, type NormalizedRole } from "@/lib/permissions";
import type { ManagerCockpitMetrics } from "@/lib/crm/analytics";
import { ManagerActionCockpit } from "@/components/dashboard/ManagerActionCockpit";
import { SellerActionCockpit } from "@/components/dashboard/SellerActionCockpit";
import { TeamPerformanceTable } from "@/components/dashboard/team-performance-table";

export interface DashboardPageClientProps {
  initialMetrics: ManagerCockpitMetrics;
  serverRole: NormalizedRole;
  userName: string;
  isDemo: boolean;
}

export function DashboardPageClient({
  initialMetrics,
  serverRole,
  userName,
  isDemo,
}: DashboardPageClientProps) {
  const { role: demoRole, isDemoMode, sellerName: demoSellerName } = useDemoRole();
  const effectiveRole = isDemo ? (isDemoMode ? normalizeRole(demoRole) : serverRole) : serverRole;
  const isSeller = effectiveRole === "seller";
  const activeSellerName = isDemo ? demoSellerName : userName;

  if (isSeller) {
    return (
      <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Cabeçalho do Vendedor */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Meu Cockpit
              </h1>
              <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-2.5 py-0.5 text-xs font-bold text-blue-400 flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5" />
                Visão do Vendedor
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Acompanhe seus leads pendentes, tempo de resposta pessoal e metas de fechamento do mês.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard/leads"
              className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 border border-orange-500/30 px-3.5 py-2 text-xs font-bold text-white transition-all shadow-sm shadow-orange-600/20"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Abrir Meus Leads / Kanban</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Cockpit Exclusivo do Vendedor (Zero vazamento executivo) */}
        <SellerActionCockpit
          metrics={initialMetrics}
          sellerName={activeSellerName}
          isDemo={isDemo}
        />
      </div>
    );
  }

  // Visão do Gestor / Administrador
  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Cabeçalho Executivo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Cockpit do Gestor
            </h1>
            <span className="rounded-full bg-orange-500/20 border border-orange-500/30 px-2.5 py-0.5 text-xs font-bold text-orange-400 flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" />
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
      <ManagerActionCockpit metrics={initialMetrics} />

      {/* Tabela de Ranking da Equipe & Adição Rápida de Vendedores */}
      <TeamPerformanceTable initialSellers={initialMetrics.sellerRanking} />
    </div>
  );
}
