/**
 * @file recommended-actions.test.tsx
 * @description Testes Unitários para o Componente de Ações Recomendadas (RecommendedActions).
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RecommendedActions } from "@/components/dashboard/recommended-actions";
import type { SystemRecommendation } from "@/lib/crm/analytics";

describe("[UNIT-RECOMMENDED-ACTIONS] Componente de Ações Recomendadas", () => {
  it("deve renderizar o estado de sucesso quando a lista de recomendações estiver vazia", () => {
    render(<RecommendedActions recommendations={[]} />);

    expect(screen.getByTestId("recommended-actions-empty")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma ação crítica pendente")).toBeInTheDocument();
    expect(
      screen.getByText(/Excelente! Toda a equipe comercial está atendendo dentro dos SLAs estabelecidos/i)
    ).toBeInTheDocument();
  });

  it("deve renderizar os cards elegantes com badges correspondentes por severidade", () => {
    const mockRecs: SystemRecommendation[] = [
      {
        id: "sla-breached",
        type: "critical",
        title: "14 leads aguardando primeiro contato urgente",
        description: "Leads ultrapassaram a meta de 15 min. Risco direto de perda de R$ 1.400.000.",
        count: 14,
        actionLabel: "Reatribuir na Roleta",
        actionType: "reassign_roleta",
        href: "/dashboard/leads?filter=sla_breached",
      },
      {
        id: "seller-sla-alert",
        type: "warning",
        title: "1 vendedor(es) com SLA crítico de resposta",
        description: "Tempo médio acima de 15 min reduz drasticamente a taxa de conversão da revenda.",
        count: 1,
        actionLabel: "Auditar Vendedores",
        actionType: "notify_seller",
        href: "/dashboard/team",
      },
      {
        id: "hot-leads-followup",
        type: "opportunity",
        title: "6 negociações quentes sem interação hoje",
        description: "Clientes em estágios avançados (Visita/Proposta) sem contato registrado no dia.",
        count: 6,
        actionLabel: "Ver no Kanban",
        actionType: "filter_kanban",
        href: "/dashboard/leads?filter=hot_no_action",
      },
    ];

    render(<RecommendedActions recommendations={mockRecs} />);

    // 1. Alerta Crítico
    expect(screen.getByText("14 leads aguardando primeiro contato urgente")).toBeInTheDocument();
    expect(screen.getByText("Crítico")).toBeInTheDocument();
    expect(screen.getByText("Reatribuir na Roleta")).toBeInTheDocument();

    // 2. Alerta de Atenção
    expect(screen.getByText("1 vendedor(es) com SLA crítico de resposta")).toBeInTheDocument();
    expect(screen.getByText("Atenção")).toBeInTheDocument();
    expect(screen.getByText("Auditar Vendedores")).toBeInTheDocument();

    // 3. Alerta de Oportunidade
    expect(screen.getByText("6 negociações quentes sem interação hoje")).toBeInTheDocument();
    expect(screen.getByText("Oportunidade")).toBeInTheDocument();
    expect(screen.getByText("Ver no Kanban")).toBeInTheDocument();
  });

  it("deve disparar onActionClick quando o botão de ação for clicado", () => {
    const onActionClick = vi.fn();
    const mockRecs: SystemRecommendation[] = [
      {
        id: "sla-breached",
        type: "critical",
        title: "5 leads aguardando",
        description: "Estouro de SLA",
        actionLabel: "Reatribuir",
        actionType: "reassign_roleta",
        href: "/dashboard/leads?filter=sla_breached",
      },
    ];

    render(<RecommendedActions recommendations={mockRecs} onActionClick={onActionClick} />);

    const btn = screen.getByTestId("btn-rec-action-sla-breached");
    fireEvent.click(btn);

    expect(onActionClick).toHaveBeenCalledTimes(1);
    expect(onActionClick).toHaveBeenCalledWith(mockRecs[0]);
  });
});
