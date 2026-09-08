/**
 * @file manager-cockpit.test.tsx
 * @description Suíte de Testes de Integração para o Cockpit "Dinheiro na Mesa" (REQ-CRM-21).
 *
 * ============================================================================
 * ESCOPO DE TESTE & RASTREABILIDADE (SUT: ManagerActionCockpit / Visão Gestor)
 * ============================================================================
 * Cenários Testados:
 *   - [IT-21.1]: Renderização dos 4 contadores de gargalo (Leads sem retorno, Propostas, Financiamento, Leads quentes).
 *   - [IT-21.2]: Renderização das ações recomendadas para os vendedores (Rafael, Juliana, Carlos).
 *   - [IT-21.3]: Disparo de notificação e cobrança no WhatsApp com abertura de deep link formatado.
 *   - [IT-21.4]: Interatividade de colapso e expansão do cockpit.
 *
 * Padrão Estrutural: AAA (Arrange, Act, Assert)
 * Ambiente: Happy-DOM / Vitest / Testing Library
 * ============================================================================
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ManagerActionCockpit } from "@/components/dashboard/ManagerActionCockpit";
import type { ManagerCockpitMetrics } from "@/lib/crm/analytics";

const mockMetricsWithActions: ManagerCockpitMetrics = {
  totalPipelineValue: 2768000,
  valueAtRisk: 285000,
  totalActiveLeads: 21,
  totalLeads: 81,
  averageFirstContactMinutes: 4.2,
  slaComplianceRate: 88,
  overdueLeadsCount: 12,
  wonLeadsCount: 12,
  conversionRate: 14.8,
  sellerRanking: [
    {
      sellerName: "Cris Test of",
      leadsCount: 19,
      activeDeals: 8,
      wonDeals: 4,
      avgResponseMinutes: 6.0,
      slaBadge: "verde",
      sharePercentage: 35.0,
      pipelineValue: 1050000,
      revenue: 520000,
    },
  ],
  bottlenecks: {
    withoutReturnCount: 12,
    proposalsWithoutFollowupCount: 8,
    pendingFinancingCount: 5,
    hotLeadsCount: 17,
  },
  recommendedActions: [
    {
      id: "act-1",
      sellerName: "Cris Test of",
      avatar: "CT",
      actionText: "4 leads sem retorno imediato",
      leadCount: 4,
      urgencyType: "danger",
      timeText: "Há 42 min",
      defaultMessage:
        "Olá Cris, identifiquei no Acelera que você possui 4 novos leads aguardando resposta há mais de 15 minutos. Vamos priorizar o contato agora para não esfriar!",
      phone: "5511988887777",
    },
    {
      id: "act-2",
      sellerName: "Lucas Mendes",
      avatar: "LM",
      actionText: "2 propostas sem follow-up há 48h",
      leadCount: 2,
      urgencyType: "warning",
      timeText: "Há 2 dias",
      defaultMessage:
        "Oi Lucas, temos 2 propostas de clientes com mais de 48h sem retorno no funil. Consegue fazer um follow-up com eles hoje?",
      phone: "5511977776666",
    },
  ],
};

const mockMetricsEmptyActions: ManagerCockpitMetrics = {
  ...mockMetricsWithActions,
  recommendedActions: [],
};

describe("[IT-21] Cockpit Executivo 'Dinheiro na Mesa' (ManagerActionCockpit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[IT-21.1] Deve renderizar o título e os 4 contadores de gargalo com contagens corretas", () => {
    // Arrange & Act
    render(<ManagerActionCockpit metrics={mockMetricsWithActions} />);

    // Assert
    expect(
      screen.getByRole("heading", { name: /quem está deixando dinheiro na mesa\?/i })
    ).toBeInTheDocument();

    // 4 Indicadores
    expect(screen.getByText("Leads sem retorno")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();

    expect(screen.getByText("Propostas sem follow-up")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();

    expect(screen.getByText("Aguardando financiamento")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();

    expect(screen.getByText("Leads quentes sem ação hoje")).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();
  });

  it("[IT-21.2] Deve exibir a lista de ações recomendadas por vendedor quando houver pendências", () => {
    // Arrange & Act
    render(<ManagerActionCockpit metrics={mockMetricsWithActions} />);

    // Assert
    expect(screen.getByText(/ações recomendadas pelo sistema/i)).toBeInTheDocument();
    expect(screen.getByText("Cris Test of")).toBeInTheDocument();
    expect(screen.getByText("4 leads sem retorno imediato")).toBeInTheDocument();

    expect(screen.getByText("Lucas Mendes")).toBeInTheDocument();
    expect(screen.getByText("2 propostas sem follow-up há 48h")).toBeInTheDocument();
  });

  it("[IT-21.3] Deve exibir empty state positivo quando não houver ações críticas pendentes (actions.length === 0)", () => {
    // Arrange & Act
    render(<ManagerActionCockpit metrics={mockMetricsEmptyActions} />);

    // Assert
    expect(screen.getByTestId("recommended-actions-empty")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma ação crítica pendente")).toBeInTheDocument();
    expect(
      screen.getByText(/todos os leads e propostas estão sendo atendidos dentro dos prazos de sla/i)
    ).toBeInTheDocument();
  });

  it("[IT-21.4] Deve acionar cobrança no WhatsApp do vendedor ao clicar no botão de ação", () => {
    // Arrange
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<ManagerActionCockpit metrics={mockMetricsWithActions} />);

    const cobrancaBtn = screen.getByRole("button", {
      name: /cobrar cris test of no whatsapp/i,
    });

    // Act
    fireEvent.click(cobrancaBtn);

    // Assert
    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringContaining("wa.me/5511988887777"),
      "_blank",
      "noopener,noreferrer"
    );
    expect(screen.getByText("Cobrado")).toBeInTheDocument();
  });

  it("[IT-21.5] Deve recolher e expandir o cockpit ao clicar no botão de toggle", () => {
    // Arrange
    render(<ManagerActionCockpit metrics={mockMetricsWithActions} />);

    // Inicialmente expandido
    expect(screen.getByText("12")).toBeInTheDocument();

    // Act 1: Recolher
    const toggleBtn = screen.getByRole("button", { name: /recolher cockpit/i });
    fireEvent.click(toggleBtn);

    // Assert 1: Os detalhes são recolhidos
    expect(screen.queryByText("12")).not.toBeInTheDocument();

    // Act 2: Expandir novamente
    const expandBtn = screen.getByRole("button", { name: /expandir cockpit/i });
    fireEvent.click(expandBtn);

    // Assert 2: Conteúdo restaurado
    expect(screen.getByText("12")).toBeInTheDocument();
  });
});
