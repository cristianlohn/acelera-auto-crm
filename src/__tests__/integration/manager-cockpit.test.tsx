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

describe("[IT-21] Cockpit Executivo 'Dinheiro na Mesa' (ManagerActionCockpit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[IT-21.1] Deve renderizar o título e os 4 contadores de gargalo com contagens corretas", () => {
    // Arrange & Act
    render(<ManagerActionCockpit />);

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

  it("[IT-21.2] Deve exibir a lista de ações recomendadas por vendedor", () => {
    // Arrange & Act
    render(<ManagerActionCockpit />);

    // Assert
    expect(screen.getByText(/ações recomendadas pelo sistema/i)).toBeInTheDocument();
    expect(screen.getByText("Rafael Alves")).toBeInTheDocument();
    expect(screen.getByText("4 leads sem retorno imediato")).toBeInTheDocument();

    expect(screen.getByText("Juliana Lima")).toBeInTheDocument();
    expect(screen.getByText("2 propostas sem follow-up há 48h")).toBeInTheDocument();

    expect(screen.getByText("Carlos Souza")).toBeInTheDocument();
    expect(screen.getByText("1 lead quente parado há 5 horas")).toBeInTheDocument();
  });

  it("[IT-21.3] Deve acionar cobrança no WhatsApp do vendedor ao clicar no botão de ação", () => {
    // Arrange
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<ManagerActionCockpit />);

    const cobrancaBtn = screen.getByRole("button", {
      name: /cobrar rafael alves no whatsapp/i,
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

  it("[IT-21.4] Deve recolher e expandir o cockpit ao clicar no botão de toggle", () => {
    // Arrange
    render(<ManagerActionCockpit />);

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
