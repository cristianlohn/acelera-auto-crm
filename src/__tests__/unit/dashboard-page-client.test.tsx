/**
 * @file dashboard-page-client.test.tsx
 * @description Testes unitários para o controle de acesso RBAC no Cockpit (Vendedor vs Gestor).
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardPageClient } from "@/components/dashboard/dashboard-page-client";
import { DemoRoleProvider } from "@/context/demo-role-context";
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

  it("Em produção (isDemo=false) sem leads, exibe zero-states reais (0 leads e R$ 0) e o nome do usuário autenticado, NUNCA 'Roberto Silva'", () => {
    const emptyMetrics: ManagerCockpitMetrics = {
      totalPipelineValue: 0,
      valueAtRisk: 0,
      totalActiveLeads: 0,
      totalLeads: 0,
      averageFirstContactMinutes: 0,
      slaComplianceRate: 100,
      overdueLeadsCount: 0,
      wonLeadsCount: 0,
      conversionRate: 0,
      sellerRanking: [],
    };

    render(
      <DashboardPageClient
        initialMetrics={emptyMetrics}
        serverRole="seller"
        userName="Cris Test of"
        isDemo={false}
      />
    );

    // O badge deve exibir o nome do usuário real
    expect(screen.getByText("Cris Test of")).toBeInTheDocument();
    expect(screen.queryByText(/roberto silva/i)).not.toBeInTheDocument();

    // Métricas do card devem conter 0 e R$ 0, e NUNCA 12 ou 1.480.000
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("R$ 0").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/1\.480\.000/)).not.toBeInTheDocument();
    expect(screen.queryByText(/12 aguardando retorno/i)).not.toBeInTheDocument();
  });

  it("Em modo demonstração (isDemo=true), preserva os dados simulados do demo mode (12 aguardando retorno e R$ 1.480.000)", () => {
    render(
      <DemoRoleProvider initialRole="vendedor" initialDemoMode={true}>
        <DashboardPageClient
          initialMetrics={mockMetrics}
          serverRole="seller"
          userName="Rafael Alves"
          isDemo={true}
        />
      </DemoRoleProvider>
    );

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText(/1\.480\.000/)).toBeInTheDocument();
  });
});
