/**
 * @file kanban-drag-drop.test.tsx
 * @description Suíte de Testes Unitários para Drag & Drop e Modal de Detalhes do Funil Kanban.
 *
 * Escopo de Testes:
 * - [UT-KDD.1]: Card de Lead inicia arrasto populando dataTransfer com leadId e texto puro.
 * - [UT-KDD.2]: Coluna do Kanban reage aos eventos de dragOver, dragEnter, dragLeave e drop.
 * - [UT-KDD.3]: Movimentação de card no KanbanBoard executa atualização otimista e chama updateLeadStageAction.
 * - [UT-KDD.4]: Clique no card do lead abre o LeadDetailsModal exibindo informações completas.
 * - [UT-KDD.5]: Mudança de etapa dentro do modal avança a fase do lead.
 * - [UT-KDD.6]: Edição e persistência de anotações dispara callback de atualização.
 * - [UT-KDD.7]: Fechamento do modal via botão Fechar ou tecla Escape.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { KanbanCard } from "@/components/kanban/kanban-card";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { LeadDetailsModal } from "@/components/kanban/lead-details-modal";
import type { KanbanLead, KanbanColumnConfig } from "@/types/kanban";

// Mock das Server Actions
vi.mock("@/app/actions/kanban-actions", () => ({
  updateLeadStageAction: vi.fn().mockResolvedValue({ success: true }),
  updateLeadNotesAction: vi.fn().mockResolvedValue({ success: true }),
  updateLeadLostReasonAction: vi.fn().mockResolvedValue({ success: true }),
  updateLeadAssignedSellerAction: vi.fn().mockResolvedValue({ success: true }),
  getKanbanBoardAction: vi.fn().mockResolvedValue({ columns: [] }),
}));

vi.mock("@/app/actions/auth", () => ({
  getCurrentUserProfileAction: vi.fn().mockResolvedValue({
    userId: "admin-1",
    fullName: "Admin Responsável",
    role: "admin",
    isDemo: false,
  }),
}));

vi.mock("@/app/actions/team-actions", () => ({
  getTeamMembersAction: vi.fn().mockResolvedValue([]),
}));

// Mock do Sonner Toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockLead: KanbanLead = {
  id: "lead-test-01",
  organization_id: "org-test-1",
  name: "Bruno Silveira",
  phone: "+5511999998888",
  email: "bruno@email.com",
  source: "webmotors",
  vehicle_of_interest: "Honda HR-V Touring 2024",
  assigned_to: {
    id: "sp-01",
    name: "Rafael Alves",
    phone: "+5511988887777",
  },
  assigned_to_name: "Rafael Alves",
  stage: "new",
  sla_minutes: 5,
  sla_minutes_elapsed: 3,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  value: 175000,
  segment: "used_cars",
  notes: "Cliente quer dar seminovo na troca.",
};

const mockColumn: KanbanColumnConfig = {
  id: "in_contact",
  title: "Primeiro Contato",
  shortTitle: "Contato",
  color: "text-cyan-400",
  bgColor: "bg-cyan-950/20",
  borderColor: "border-cyan-500/30",
  badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  dotColor: "bg-cyan-500",
  leads: [],
  totalValue: 0,
};

describe("[UT-KANBAN] Drag & Drop Nativo e Modal de Detalhes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[UT-KDD.1] Deve configurar draggable e popular dataTransfer no onDragStart do KanbanCard", () => {
    const handleSelect = vi.fn();
    render(<KanbanCard lead={mockLead} onSelectLead={handleSelect} />);

    const card = screen.getByTestId("kanban-card");
    expect(card).toHaveAttribute("draggable", "true");

    const dataStore: Record<string, string> = {};
    const mockDataTransfer = {
      setData: vi.fn((key: string, val: string) => {
        dataStore[key] = val;
      }),
      getData: vi.fn((key: string) => dataStore[key]),
      effectAllowed: "none",
    };

    fireEvent.dragStart(card, {
      dataTransfer: mockDataTransfer,
    });

    expect(mockDataTransfer.setData).toHaveBeenCalledWith("leadId", "lead-test-01");
    expect(mockDataTransfer.setData).toHaveBeenCalledWith("text/plain", "lead-test-01");
  });

  it("[UT-KDD.2] Deve chamar onDropLead com leadId e stage correto no onDrop da KanbanColumn", () => {
    const handleDropLead = vi.fn();
    render(<KanbanColumn column={mockColumn} onDropLead={handleDropLead} />);

    const column = screen.getByTestId("kanban-column");

    // Simula dragOver
    fireEvent.dragOver(column, {
      dataTransfer: { dropEffect: "" },
    });

    // Simula drop
    fireEvent.drop(column, {
      dataTransfer: {
        getData: (type: string) => (type === "leadId" ? "lead-test-01" : ""),
      },
    });

    expect(handleDropLead).toHaveBeenCalledWith("lead-test-01", "in_contact");
  });

  it("[UT-KDD.3] Deve mover o lead otimisticamente e disparar persistência no KanbanBoard", async () => {
    const { updateLeadStageAction } = await import("@/app/actions/kanban-actions");
    render(<KanbanBoard initialLeads={[mockLead]} />);

    // Verifica que o lead está inicialmente na coluna Novos Leads
    expect(screen.getByText("Bruno Silveira")).toBeInTheDocument();

    // Localiza a coluna de destino (Primeiro Contato)
    const contactColumn = screen.getAllByTestId("kanban-column").find(
      (col) => col.getAttribute("data-stage-id") === "in_contact"
    );
    expect(contactColumn).toBeDefined();

    // Dispara drop na coluna
    await act(async () => {
      fireEvent.drop(contactColumn!, {
        dataTransfer: {
          getData: (type: string) => (type === "leadId" ? "lead-test-01" : ""),
        },
      });
    });

    expect(updateLeadStageAction).toHaveBeenCalledWith("lead-test-01", "in_contact");
  });

  it("[UT-KDD.4] Deve abrir o LeadDetailsModal ao clicar no card do lead", async () => {
    const user = userEvent.setup();
    render(<KanbanBoard initialLeads={[mockLead]} />);

    const card = screen.getByTestId("kanban-card");
    await user.click(card);

    // Modal aberto
    const modal = screen.getByTestId("lead-details-modal");
    expect(modal).toBeInTheDocument();

    expect(within(modal).getByTestId("lead-details-name")).toHaveTextContent("Bruno Silveira");
    expect(within(modal).getByTestId("lead-details-phone")).toHaveTextContent("+5511999998888");
    expect(within(modal).getByTestId("lead-details-vehicle")).toHaveTextContent("Honda HR-V Touring 2024");
    expect(within(modal).getByText("Rafael Alves")).toBeInTheDocument();
  });

  it("[UT-KDD.5] Deve alterar a etapa do lead via seletor rápido no modal", async () => {
    const handleUpdateStage = vi.fn();
    const handleClose = vi.fn();

    render(
      <LeadDetailsModal
        isOpen={true}
        lead={mockLead}
        onClose={handleClose}
        onUpdateStage={handleUpdateStage}
      />
    );

    // Clica no botão de etapa "Test Drive"
    const testDriveBtn = screen.getByTestId("btn-stage-test_drive");
    fireEvent.click(testDriveBtn);

    expect(handleUpdateStage).toHaveBeenCalledWith("lead-test-01", "test_drive");
  });

  it("[UT-KDD.6] Deve atualizar e salvar anotações do lead no modal", async () => {
    const handleUpdateNotes = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <LeadDetailsModal
        isOpen={true}
        lead={mockLead}
        onClose={vi.fn()}
        onUpdateStage={vi.fn()}
        onUpdateNotes={handleUpdateNotes}
      />
    );

    const textarea = screen.getByTestId("lead-notes-textarea");
    await user.clear(textarea);
    await user.type(textarea, "Cliente aprovou a taxa do financiamento.");

    const saveBtn = screen.getByTestId("btn-save-lead-notes");
    await user.click(saveBtn);

    expect(handleUpdateNotes).toHaveBeenCalledWith(
      "lead-test-01",
      "Cliente aprovou a taxa do financiamento."
    );
  });

  it("[UT-KDD.7] Deve fechar o modal via botão de fechar e via tecla Escape", async () => {
    const handleClose = vi.fn();
    const { rerender } = render(
      <LeadDetailsModal
        isOpen={true}
        lead={mockLead}
        onClose={handleClose}
        onUpdateStage={vi.fn()}
      />
    );

    // 1. Clique no botão de fechar
    const closeBtn = screen.getByTestId("btn-close-lead-details");
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // 2. Tecla Escape
    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(2);

    // Quando isOpen for false, não deve renderizar nada
    rerender(
      <LeadDetailsModal
        isOpen={false}
        lead={mockLead}
        onClose={handleClose}
        onUpdateStage={vi.fn()}
      />
    );
    expect(screen.queryByTestId("lead-details-modal")).not.toBeInTheDocument();
  });
});
