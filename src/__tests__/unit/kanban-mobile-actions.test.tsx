/**
 * @file kanban-mobile-actions.test.tsx
 * @description Suíte de Testes Automatizados para Controles Rápidos Mobile e Bottom Sheet no Kanban.
 *
 * Cenários Testados:
 * - [TEST-MOBILE-ADVANCE]: Disparo de avanço de etapa pelo botão mobile sem propagar clique para o card.
 * - [TEST-MOBILE-RETREAT]: Disparo de recuo de etapa pelo botão mobile sem propagar clique para o card.
 * - [TEST-MOBILE-PREV-DISABLED]: Desabilitação do botão de recuo quando o lead está na primeira etapa ('new').
 * - [TEST-MOBILE-SELECT]: Mudança de etapa através do seletor dropdown mobile.
 * - [TEST-CARD-SELECT]: Clique no corpo do card continua abrindo o modal de detalhes normalmente.
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { KanbanCard } from "@/components/kanban/kanban-card";
import type { KanbanLead } from "@/types/kanban";

const mockLeadNew: KanbanLead = {
  id: "lead-mobile-001",
  organization_id: "org-test",
  name: "Marcos Oliveira",
  phone: "11988887777",
  email: "marcos@email.com",
  source: "site",
  vehicle_of_interest: "Toyota Corolla Cross XRE",
  assigned_to: { id: "seller-1", name: "Rafael Alves" },
  assigned_to_name: "Rafael Alves",
  stage: "new",
  sla_minutes: 15,
  sla_minutes_elapsed: 3,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  value: 175000,
  notes: "Interesse em financiamento com 50% de entrada.",
};

const mockLeadInContact: KanbanLead = {
  ...mockLeadNew,
  id: "lead-mobile-002",
  stage: "in_contact",
};

describe("[UNIT-KANBAN-MOBILE] Controles Rápidos de Etapa no Card para Mobile", () => {
  it("[TEST-MOBILE-ADVANCE] deve avançar a etapa via botão mobile sem disparar seleção do card", () => {
    const handleMoveStage = vi.fn();
    const handleSelectLead = vi.fn();

    render(
      <KanbanCard
        lead={mockLeadNew}
        onMoveStage={handleMoveStage}
        onSelectLead={handleSelectLead}
      />
    );

    const advanceBtn = screen.getByRole("button", { name: /avançar etapa/i });
    expect(advanceBtn).toBeInTheDocument();
    expect(advanceBtn).not.toBeDisabled();

    fireEvent.click(advanceBtn);

    expect(handleMoveStage).toHaveBeenCalledWith("lead-mobile-001", "in_contact");
    expect(handleSelectLead).not.toHaveBeenCalled();
  });

  it("[TEST-MOBILE-RETREAT] deve recuar a etapa via botão mobile sem disparar seleção do card", () => {
    const handleMoveStage = vi.fn();
    const handleSelectLead = vi.fn();

    render(
      <KanbanCard
        lead={mockLeadInContact}
        onMoveStage={handleMoveStage}
        onSelectLead={handleSelectLead}
      />
    );

    const prevBtn = screen.getByTestId("btn-previous-stage");
    expect(prevBtn).toBeInTheDocument();
    expect(prevBtn).not.toBeDisabled();

    fireEvent.click(prevBtn);

    expect(handleMoveStage).toHaveBeenCalledWith("lead-mobile-002", "new");
    expect(handleSelectLead).not.toHaveBeenCalled();
  });

  it("[TEST-MOBILE-PREV-DISABLED] deve manter o botão de recuo desabilitado na primeira etapa ('new')", () => {
    render(<KanbanCard lead={mockLeadNew} />);

    const prevBtn = screen.getByTestId("btn-previous-stage");
    expect(prevBtn).toBeDisabled();
  });

  it("[TEST-MOBILE-SELECT] deve alterar o status do lead através do seletor dropdown mobile", () => {
    const handleMoveStage = vi.fn();
    const handleSelectLead = vi.fn();

    render(
      <KanbanCard
        lead={mockLeadNew}
        onMoveStage={handleMoveStage}
        onSelectLead={handleSelectLead}
      />
    );

    const select = screen.getByTestId("select-mobile-stage");
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue("new");

    fireEvent.change(select, { target: { value: "test_drive" } });

    expect(handleMoveStage).toHaveBeenCalledWith("lead-mobile-001", "test_drive");
    expect(handleSelectLead).not.toHaveBeenCalled();
  });

  it("[TEST-CARD-SELECT] deve abrir os detalhes do lead ao tocar no corpo do card", () => {
    const handleSelectLead = vi.fn();

    render(
      <KanbanCard
        lead={mockLeadNew}
        onSelectLead={handleSelectLead}
      />
    );

    const card = screen.getByTestId("kanban-card");
    fireEvent.click(card);

    expect(handleSelectLead).toHaveBeenCalledWith(mockLeadNew);
  });
});
