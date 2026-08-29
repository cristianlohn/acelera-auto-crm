/**
 * @file dashboard-page-client.test.tsx
 * @description Testes unitários para o controle de acesso RBAC no Cockpit (Vendedor vs Gestor).
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardPageClient } from "@/components/dashboard/dashboard-page-client";
import type { ManagerCockpitMetrics } from "@/lib/crm/analytics";

const mockMetrics: ManagerCockpitMetrics = {
  totalPipelineValue: 500000,
  valueAtRisk: 120000,
  totalActiveLeads: 8,
  totalLeads: 15,
  averageFirstContactMinutes: 6.5,
  slaComplianceRate: 92,
  overdueLeadsCount: 1,
  wonLeadsCount: 3,
  conversionRate: 20,
  sellerRanking: [
    {
      sellerName: "Vendedor Teste",
      leadsCount: 5,
      activeDeals: 3,
      wonDeals: 2,
      avgResponseMinutes: 5.0,
      slaBadge: "verde",
      sharePercentage: 60,
    },
  ],
};

describe("[UT-COCKPIT-RBAC] Renderização Condicional do Cockpit por Papel (Vendedor vs Gestor)", () => {
  it("Para vendedor (seller), exibe apenas o Meu Cockpit de Vendas e OCULTA 'Quem está deixando dinheiro na mesa' e 'Ranking da Equipe'", () => {
    render(
      <DashboardPageClient
        initialMetrics={mockMetrics}
        serverRole="seller"
        userName="Vendedor Teste"
        isDemo={false}
      />
    );

    // Deve exibir elementos exclusivos do vendedor
    expect(screen.getByRole("heading", { level: 1, name: "Meu Cockpit" })).toBeInTheDocument();
    expect(screen.getByText(/visão do vendedor/i)).toBeInTheDocument();
    expect(screen.getByText(/meus leads pendentes de resposta/i)).toBeInTheDocument();
    expect(screen.getByText(/minhas vendas do mês/i)).toBeInTheDocument();
    expect(screen.getByText(/meu sla pessoal/i)).toBeInTheDocument();

    // NÃO deve exibir elementos executivos do gestor
    expect(
      screen.queryByRole("heading", { name: /quem está deixando dinheiro na mesa\?/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/ranking da equipe & auditoria da roleta/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+ adicionar vendedor/i)).not.toBeInTheDocument();
  });

  it("Para gestor/admin (manager), exibe o Cockpit do Gestor com 'Quem está deixando dinheiro na mesa' e 'Ranking da Equipe'", () => {
    render(
      <DashboardPageClient
        initialMetrics={mockMetrics}
        serverRole="manager"
        userName="Gerente Teste"
        isDemo={false}
      />
    );

    // Deve exibir elementos executivos do gestor
    expect(screen.getByRole("heading", { level: 1, name: "Cockpit do Gestor" })).toBeInTheDocument();
    expect(screen.getByText(/visão executiva/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /quem está deixando dinheiro na mesa\?/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/ranking da equipe & auditoria da roleta/i)).toBeInTheDocument();
  });
});
