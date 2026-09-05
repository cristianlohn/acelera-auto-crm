/**
 * @file mobile-kanban-tabs.test.tsx
 * @description Suíte de Testes Unitários e de Integração do MobileKanbanTabs (Visualização Mobile do Funil de Vendas).
 *
 * Cenários Testados:
 * - [MOB-KANBAN-01]: Renderização das abas de etapas com contagem correta de leads por coluna.
 * - [MOB-KANBAN-02]: Alternância entre abas exibe estritamente os leads pertencentes à etapa selecionada.
 * - [MOB-KANBAN-03]: Exibição do estado vazio amigável quando a etapa não possui nenhum lead ("Nenhum lead nesta etapa").
 * - [MOB-KANBAN-04]: Clique no botão "Avançar" dispara a mutação correspondente (onMoveStage ou onMoveLead) com o ID do lead.
 * - [MOB-KANBAN-05]: Abertura do Bottom Sheet de Mover Etapa e seleção direta de nova etapa.
 * - [MOB-KANBAN-06]: Disparo do link de WhatsApp formatado ao clicar no botão de WhatsApp.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileKanbanTabs } from "@/components/kanban/mobile-kanban-tabs";
import type { KanbanLead, KanbanColumnConfig } from "@/types/kanban";
import type { Lead } from "@/types/crm";

const MOCK_KANBAN_LEADS: KanbanLead[] = [
  {
    id: "lead-mob-1",
    organization_id: "org-1",
    name: "Carlos Ferreira",
    phone: "11988881111",
    source: "webmotors",
    vehicle_of_interest: "Honda Civic Touring 2023",
    assigned_to: { id: "seller-1", name: "Rafael Alves" },
    assigned_to_name: "Rafael Alves",
    stage: "new",
    sla_minutes: 10,
    sla_minutes_elapsed: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    value: 155000,
  },
  {
    id: "lead-mob-2",
    organization_id: "org-1",
    name: "Mariana Souza",
    phone: "11977772222",
    source: "meta_ads",
    vehicle_of_interest: "Toyota Corolla Cross XRX 2024",
    assigned_to: { id: "seller-2", name: "Juliana Lima" },
    assigned_to_name: "Juliana Lima",
    stage: "in_contact",
    sla_minutes: 15,
    sla_minutes_elapsed: 8,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    value: 198000,
  },
  {
    id: "lead-mob-3",
    organization_id: "org-1",
    name: "Roberto Campos",
    phone: "11966663333",
    source: "site",
    vehicle_of_interest: "Jeep Compass Longitude 2022",
    assigned_to: { id: "seller-1", name: "Rafael Alves" },
    assigned_to_name: "Rafael Alves",
    stage: "test_drive",
    sla_minutes: 20,
    sla_minutes_elapsed: 12,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    value: 135000,
  },
];

describe("[MOB-KANBAN] MobileKanbanTabs (Visualização Mobile do Funil de Vendas)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[MOB-KANBAN-01] Deve renderizar as abas de etapas com badges de contagem corretos", () => {
    render(<MobileKanbanTabs leads={MOCK_KANBAN_LEADS} />);

    expect(screen.getByTestId("mobile-kanban-tabs")).toBeInTheDocument();

    // Abas presentes
    expect(screen.getByTestId("tab-stage-new")).toBeInTheDocument();
    expect(screen.getByTestId("tab-stage-contact")).toBeInTheDocument();
    expect(screen.getByTestId("tab-stage-visit")).toBeInTheDocument();
    expect(screen.getByTestId("tab-stage-proposal")).toBeInTheDocument();
    expect(screen.getByTestId("tab-stage-won")).toBeInTheDocument();
    expect(screen.getByTestId("tab-stage-lost")).toBeInTheDocument();

    // Contagens
    expect(screen.getByTestId("badge-count-new")).toHaveTextContent("1");
    expect(screen.getByTestId("badge-count-contact")).toHaveTextContent("1");
    expect(screen.getByTestId("badge-count-visit")).toHaveTextContent("1");
    expect(screen.getByTestId("badge-count-proposal")).toHaveTextContent("0");
    expect(screen.getByTestId("badge-count-won")).toHaveTextContent("0");
    expect(screen.getByTestId("badge-count-lost")).toHaveTextContent("0");
  });

  it("[MOB-KANBAN-02] Deve alternar entre abas e exibir os leads correspondentes", () => {
    render(<MobileKanbanTabs leads={MOCK_KANBAN_LEADS} />);

    // Inicialmente na aba "Novos" (tem 1 lead: Carlos Ferreira)
    expect(screen.getByText("Carlos Ferreira")).toBeInTheDocument();
    expect(screen.getByText("Honda Civic Touring 2023")).toBeInTheDocument();
    expect(screen.queryByText("Mariana Souza")).not.toBeInTheDocument();

    // Clica na aba "1º Contato"
    fireEvent.click(screen.getByTestId("tab-stage-contact"));

    // Agora exibe Mariana Souza e oculta Carlos Ferreira
    expect(screen.getByText("Mariana Souza")).toBeInTheDocument();
    expect(screen.getByText("Toyota Corolla Cross XRX 2024")).toBeInTheDocument();
    expect(screen.queryByText("Carlos Ferreira")).not.toBeInTheDocument();

    // Clica na aba "Visitas"
    fireEvent.click(screen.getByTestId("tab-stage-visit"));

    expect(screen.getByText("Roberto Campos")).toBeInTheDocument();
    expect(screen.getByText("Jeep Compass Longitude 2022")).toBeInTheDocument();
  });

  it("[MOB-KANBAN-03] Deve exibir estado vazio amigável quando a etapa selecionada não tiver leads", () => {
    render(<MobileKanbanTabs leads={MOCK_KANBAN_LEADS} />);

    // Clica na aba "Propostas" (que tem 0 leads)
    fireEvent.click(screen.getByTestId("tab-stage-proposal"));

    expect(screen.getByTestId("empty-stage-state")).toBeInTheDocument();
    expect(screen.getByText("Nenhum lead nesta etapa")).toBeInTheDocument();
    expect(screen.queryByText("Carlos Ferreira")).not.toBeInTheDocument();
  });

  it("[MOB-KANBAN-04] Deve chamar onMoveStage ao clicar no botão 'Avançar'", () => {
    const onMoveStageMock = vi.fn();
    render(<MobileKanbanTabs leads={MOCK_KANBAN_LEADS} onMoveStage={onMoveStageMock} />);

    // Na aba 'new', Carlos Ferreira deve ter o botão de avançar para 'in_contact'
    const advanceBtn = screen.getByTestId("btn-advance-stage-lead-mob-1");
    expect(advanceBtn).toBeInTheDocument();

    fireEvent.click(advanceBtn);

    expect(onMoveStageMock).toHaveBeenCalledWith("lead-mob-1", "in_contact");
  });

  it("[MOB-KANBAN-05] Deve abrir o Drawer (Bottom Sheet) e permitir selecionar qualquer etapa de destino", () => {
    const onMoveStageMock = vi.fn();
    render(<MobileKanbanTabs leads={MOCK_KANBAN_LEADS} onMoveStage={onMoveStageMock} />);

    // Clica no botão de opções/drawer do lead
    const openDrawerBtn = screen.getByTestId("btn-open-drawer-lead-mob-1");
    fireEvent.click(openDrawerBtn);

    expect(screen.getByTestId("drawer-move-stage")).toBeInTheDocument();
    expect(screen.getByText("Mover Lead de Etapa")).toBeInTheDocument();

    // Clica na opção "Proposta & F&I"
    const proposalOption = screen.getByTestId("drawer-stage-option-proposal");
    fireEvent.click(proposalOption);

    expect(onMoveStageMock).toHaveBeenCalledWith("lead-mob-1", "proposal");
  });

  it("[MOB-KANBAN-06] Deve disparar o link de WhatsApp formatado ao clicar no botão de WhatsApp", () => {
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<MobileKanbanTabs leads={MOCK_KANBAN_LEADS} />);

    const whatsappBtn = screen.getByTestId("btn-whatsapp-lead-mob-1");
    fireEvent.click(whatsappBtn);

    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringContaining("wa.me/5511988881111"),
      "_blank",
      "noopener,noreferrer"
    );
  });
});
