/**
 * @file help-page.test.tsx
 * @description Suíte de Testes de Integração da Central de Ajuda & Guia Rápido (HelpPage /ajuda).
 *
 * ============================================================================
 * ESCOPO DE TESTE & RASTREABILIDADE (SUT: HelpPage / REQ-CRM-18)
 * ============================================================================
 * Funcionalidades e Cenários Testados:
 *   - [IT-18.1]: Renderização do Header, subtítulo, campo de busca e 3 passos do Guia Rápido.
 *   - [IT-18.2]: Validação das regras de SLA (Verde <15min, Laranja 15-60min, Vermelho >60min) e fases do funil.
 *   - [IT-18.3]: Validação do catálogo de veículos, gestão de fotos e baixa automática no estoque.
 *   - [IT-18.4]: Validação dos perfis de acesso RBAC (Vendedor, Gerente Comercial, Administrador).
 *   - [IT-18.5]: Filtragem interativa por busca instantânea de termos e exibição de estado vazio.
 *   - [IT-18.6]: Filtragem por categorias de tópicos (Badges).
 *   - [IT-18.7]: Interação de toggle dos accordions expansíveis.
 *   - [IT-18.8]: Presença e atributos do link de suporte técnico via WhatsApp.
 *
 * Padrão Estrutural: AAA (Arrange, Act, Assert)
 * Ambiente de Execução: Happy-DOM / Vitest / Testing Library
 * ============================================================================
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HelpPage from "@/app/(dashboard)/ajuda/page";

describe("[IT-18] Central de Ajuda & Guia Rápido (HelpPage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[IT-18.1] Deve renderizar o cabeçalho, barra de busca e os 3 passos rápidos", () => {
    // Arrange & Act
    render(<HelpPage />);

    // Assert Header
    expect(
      screen.getByRole("heading", {
        name: /central de ajuda & guia rápido/i,
        level: 1,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/buscar tópicos de ajuda/i)
    ).toBeInTheDocument();

    // Assert 3 Passos
    expect(
      screen.getByText(/como criar seu primeiro lead/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/atendimento em 1 clique via whatsapp/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/cadastrando carros no pátio/i)
    ).toBeInTheDocument();
  });

  it("[IT-18.2] Deve detalhar as regras dos semáforos de SLA e fases do funil", () => {
    // Arrange & Act
    render(<HelpPage />);

    // Assert Semáforos de SLA
    expect(screen.getByText(/verde \(< 15 minutos\)/i)).toBeInTheDocument();
    expect(screen.getByText(/laranja \(15 a 60 minutos\)/i)).toBeInTheDocument();
    expect(screen.getByText(/vermelho \(> 60 minutos\)/i)).toBeInTheDocument();

    // Assert Fases
    expect(screen.getByText(/1\. novo lead/i)).toBeInTheDocument();
    expect(screen.getByText(/5\. venda fechada/i)).toBeInTheDocument();
  });

  it("[IT-18.3] Deve exibir orientações do catálogo de veículos e baixa automática", () => {
    // Arrange & Act
    render(<HelpPage />);

    // Assert
    expect(
      screen.getByText(/ficha técnica completa & fotos em alta/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/baixa automática no fechamento/i)
    ).toBeInTheDocument();
  });

  it("[IT-18.4] Deve descrever as permissões RBAC de Vendedor, Gerente e Admin", () => {
    // Arrange & Act
    render(<HelpPage />);

    // Assert Perfis
    expect(screen.getByText(/foco em atendimento/i)).toBeInTheDocument();
    expect(screen.getByText(/auditoria & sla/i)).toBeInTheDocument();
    expect(screen.getByText(/gestão total do negócio/i)).toBeInTheDocument();
  });

  it("[IT-18.5] Deve filtrar instantaneamente os tópicos ao digitar no campo de busca e exibir estado vazio", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<HelpPage />);

    const searchInput = screen.getByLabelText(/buscar tópicos de ajuda/i);

    // Act 1: Busca por termo existente
    await user.type(searchInput, "celular");

    // Assert 1
    expect(
      screen.getByText(/o sistema funciona perfeitamente em celulares/i)
    ).toBeInTheDocument();

    // Act 2: Busca por termo inexistente
    await user.clear(searchInput);
    await user.type(searchInput, "termo_completamente_inexistente_xyz_123");

    // Assert 2 (Estado Vazio)
    expect(
      screen.getByRole("status")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/nenhum tópico encontrado para/i)
    ).toBeInTheDocument();

    // Act 3: Limpar filtros
    const clearBtn = screen.getByRole("button", {
      name: /limpar filtros de busca/i,
    });
    await user.click(clearBtn);

    // Assert 3 (Restaura os cards principais)
    expect(
      screen.getByText(/como criar seu primeiro lead/i)
    ).toBeInTheDocument();
  });

  it("[IT-18.6] Deve filtrar os tópicos ao selecionar categorias pelas badges", () => {
    // Arrange
    render(<HelpPage />);

    // Act (Clica na categoria FAQ Automotivo)
    const faqCategoryBtn = screen.getByRole("button", {
      name: /filtrar por faq automotivo/i,
    });
    fireEvent.click(faqCategoryBtn);

    // Assert (Apenas FAQ visível)
    expect(
      screen.getByText(/como recuperar um lead marcado como perdido\?/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/como criar seu primeiro lead/i)
    ).not.toBeInTheDocument();
  });

  it("[IT-18.7] Deve permitir abrir e fechar os módulos via accordion", () => {
    // Arrange
    render(<HelpPage />);

    const slaToggleBtn = screen.getByRole("button", {
      name: /1\. funil kanban e regras de sla de atendimento/i,
    });

    // Act 1: Fecha a seção de SLA
    act(() => {
      fireEvent.click(slaToggleBtn);
    });

    // Assert 1
    expect(
      screen.queryByText(/verde \(< 15 minutos\)/i)
    ).not.toBeInTheDocument();

    // Act 2: Reabre a seção de SLA
    act(() => {
      fireEvent.click(slaToggleBtn);
    });

    // Assert 2
    expect(screen.getByText(/verde \(< 15 minutos\)/i)).toBeInTheDocument();
  });

  it("[IT-18.8] Deve conter o card de suporte humano com link direto para o WhatsApp", () => {
    // Arrange & Act
    render(<HelpPage />);

    // Assert
    const supportLink = screen.getByRole("link", {
      name: /falar no whatsapp/i,
    });
    expect(supportLink).toBeInTheDocument();
    expect(supportLink).toHaveAttribute("href", expect.stringContaining("wa.me"));
    expect(supportLink).toHaveAttribute("target", "_blank");
    expect(supportLink).toHaveAttribute("rel", "noopener noreferrer");
  });
});
