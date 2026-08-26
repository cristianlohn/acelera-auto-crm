/**
 * @file guided-tour.test.tsx
 * @description Suíte de Testes de Integração para o Tour Guiado da Demonstração (REQ-CRM-20).
 *
 * ============================================================================
 * ESCOPO DE TESTE & RASTREABILIDADE (SUT: GuidedTour / Demo Onboarding)
 * ============================================================================
 * Cenários Testados:
 *   - [IT-20.1]: Renderização do card flutuante do tour com o Passo 1 ("Cockpit do Gestor").
 *   - [IT-20.2]: Navegação para os passos subsequentes (Funil SLA, WhatsApp, Pátio, Relatórios, Ativação).
 *   - [IT-20.3]: Navegação reversa pelo botão "Voltar".
 *   - [IT-20.4]: Minimizar e reabrir o tour através da pílula flutuante.
 *   - [IT-20.5]: Fechamento do tour pelo botão de fechar (X).
 *   - [IT-20.6]: Ação final de conversão no Passo 6 apontando para o cadastro do CRM.
 *
 * Padrão Estrutural: AAA (Arrange, Act, Assert)
 * Ambiente: Happy-DOM / Vitest / Testing Library
 * ============================================================================
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GuidedTour } from "@/components/demo/GuidedTour";
import { DemoRoleProvider } from "@/context/demo-role-context";

// Mock do useRouter do Next.js
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => "/leads",
}));

describe("[IT-20] Tour Guiado da Demonstração (GuidedTour)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProvider = (component: React.ReactNode) => {
    return render(<DemoRoleProvider initialDemoMode={true}>{component}</DemoRoleProvider>);
  };

  it("[IT-20.1] Deve renderizar o card do Tour Guiado com o Passo 1 ativo", () => {
    // Arrange & Act
    renderWithProvider(<GuidedTour />);

    // Assert
    expect(screen.getByRole("dialog", { name: /tour guiado da demonstração/i })).toBeInTheDocument();
    expect(screen.getByText(/passo 1 de 6/i)).toBeInTheDocument();
    expect(screen.getByText(/cockpit do gestor/i)).toBeInTheDocument();
    expect(screen.getByText(/aqui o gestor identifica imediatamente/i)).toBeInTheDocument();
  });

  it("[IT-20.2] Deve avançar para os passos 2 a 6 ao clicar em 'Próximo'", () => {
    // Arrange
    renderWithProvider(<GuidedTour />);

    // Act 1: Passo 1 -> Passo 2 (Funil Kanban & SLA)
    const nextBtn = screen.getByRole("button", { name: /próximo/i });
    fireEvent.click(nextBtn);

    // Assert 1
    expect(screen.getByText(/passo 2 de 6/i)).toBeInTheDocument();
    expect(screen.getByText(/funil kanban & semáforos de sla/i)).toBeInTheDocument();

    // Act 2: Passo 2 -> Passo 3 (WhatsApp)
    fireEvent.click(screen.getByRole("button", { name: /próximo/i }));
    expect(screen.getByText(/passo 3 de 6/i)).toBeInTheDocument();
    expect(screen.getByText(/atendimento whatsapp em 1 clique/i)).toBeInTheDocument();

    // Act 3: Passo 3 -> Passo 4 (Estoque / Pátio)
    fireEvent.click(screen.getByRole("button", { name: /próximo/i }));
    expect(screen.getByText(/passo 4 de 6/i)).toBeInTheDocument();
    expect(screen.getByText(/gestão de pátio & giro de estoque/i)).toBeInTheDocument();
    expect(mockPush).toHaveBeenCalledWith("/vehicles");

    // Act 4: Passo 4 -> Passo 5 (Relatórios)
    fireEvent.click(screen.getByRole("button", { name: /próximo/i }));
    expect(screen.getByText(/passo 5 de 6/i)).toBeInTheDocument();
    expect(screen.getByText(/relatórios de roi por canal/i)).toBeInTheDocument();
    expect(mockPush).toHaveBeenCalledWith("/reports");

    // Act 5: Passo 5 -> Passo 6 (CTA Final)
    fireEvent.click(screen.getByRole("button", { name: /próximo/i }));
    expect(screen.getByText(/passo 6 de 6/i)).toBeInTheDocument();
    expect(screen.getByText(/pronto para acelerar sua revenda\?/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /quero colocar minha revenda/i })).toHaveAttribute(
      "href",
      "/cadastro"
    );
  });

  it("[IT-20.3] Deve permitir navegação reversa clicando no botão 'Voltar'", () => {
    // Arrange
    renderWithProvider(<GuidedTour />);

    // Avança para o passo 2
    fireEvent.click(screen.getByRole("button", { name: /próximo/i }));
    expect(screen.getByText(/passo 2 de 6/i)).toBeInTheDocument();

    // Act: Clica em Voltar
    const backBtn = screen.getByRole("button", { name: /passo anterior/i });
    fireEvent.click(backBtn);

    // Assert: Retorna ao passo 1
    expect(screen.getByText(/passo 1 de 6/i)).toBeInTheDocument();
  });

  it("[IT-20.4] Deve minimizar o tour e reabri-lo ao clicar no botão flutuante", () => {
    // Arrange
    renderWithProvider(<GuidedTour />);

    // Act 1: Minimiza
    const minimizeBtn = screen.getByRole("button", { name: /minimizar tour/i });
    fireEvent.click(minimizeBtn);

    // Assert 1: Card principal oculto e pílula exibida
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const reopenBtn = screen.getByRole("button", { name: /reabrir tour guiado/i });
    expect(reopenBtn).toBeInTheDocument();

    // Act 2: Reabre
    fireEvent.click(reopenBtn);

    // Assert 2: Card principal restaurado
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("[IT-20.5] Deve fechar o tour ao clicar no botão X", () => {
    // Arrange
    renderWithProvider(<GuidedTour />);

    // Act: Clica no X de fechar
    const closeBtn = screen.getByRole("button", { name: /fechar tour/i });
    fireEvent.click(closeBtn);

    // Assert: O tour é desmontado
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reabrir tour/i })).not.toBeInTheDocument();
  });

  it("[IT-20.6] Deve permitir navegação direta clicando nos indicadores (bolinhas) de progresso", () => {
    // Arrange
    renderWithProvider(<GuidedTour />);

    // Act: Clica no passo 4 diretamente
    const step4Btn = screen.getByRole("button", { name: /ir para passo 4/i });
    fireEvent.click(step4Btn);

    // Assert
    expect(screen.getByText(/passo 4 de 6/i)).toBeInTheDocument();
    expect(screen.getByText(/gestão de pátio & giro de estoque/i)).toBeInTheDocument();
  });
});
