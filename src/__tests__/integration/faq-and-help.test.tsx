/**
 * @file faq-and-help.test.tsx
 * @description Suíte de Testes de Integração para FAQSection e Central de Ajuda (/ajuda).
 *
 * Cenários Testados:
 * - [IT-FAQ.1]: Renderização das 4 categorias principais do FAQ na Landing Page.
 * - [IT-FAQ.2]: Interação de abertura e fechamento de Accordions (perguntas e respostas).
 * - [IT-FAQ.3]: Filtragem dinâmica do FAQ por busca em tempo real e categorias.
 * - [IT-FAQ.4]: Renderização da página pública /ajuda com guia rápido de 3 passos e canais de suporte.
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FAQSection } from "@/components/landing/FAQSection";
import MarketingHelpPage from "@/app/(marketing)/ajuda/page";

describe("[IT-FAQ] FAQ Interativo e Central de Ajuda (/ajuda)", () => {
  it("[IT-FAQ.1] Deve renderizar as perguntas essenciais cobrindo Roleta, ERPs, Estoque e LGPD", () => {
    // Arrange & Act
    render(<FAQSection />);

    // Assert
    expect(screen.getByText(/Perguntas Frequentes & Detalhes Técnicos/i)).toBeInTheDocument();
    expect(screen.getByText(/Como funciona a Roleta Automática/i)).toBeInTheDocument();
    expect(screen.getByText(/Preciso trocar o sistema fiscal/i)).toBeInTheDocument();
  });

  it("[IT-FAQ.2] Deve expandir e colapsar os accordions ao clicar nas perguntas", () => {
    // Arrange
    render(<FAQSection />);

    const button = screen.getByRole("button", {
      name: /Como funciona a Roleta Automática/i,
    });

    // Act 1: O primeiro accordion vem aberto por padrão -> clicar fecha
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");

    // Act 2: Clicar novamente abre
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText(/distribui automaticamente novos leads recebidos via Webhooks/i)
    ).toBeInTheDocument();
  });

  it("[IT-FAQ.3] Deve filtrar perguntas ao digitar na barra de busca e ao clicar nas categorias", () => {
    // Arrange
    render(<FAQSection />);

    const searchInput = screen.getByLabelText(/Campo de busca no FAQ/i);

    // Act - Filtrar por ERP
    fireEvent.change(searchInput, { target: { value: "Altimus" } });

    // Assert
    expect(screen.getByText(/Preciso trocar o sistema fiscal/i)).toBeInTheDocument();
    expect(screen.queryByText(/Como funciona a Roleta Automática/i)).not.toBeInTheDocument();

    // Act - Limpar busca e filtrar por categoria
    fireEvent.change(searchInput, { target: { value: "" } });
    const btnCategorySeguranca = screen.getByRole("button", {
      name: /Segurança & LGPD/i,
    });
    fireEvent.click(btnCategorySeguranca);

    // Assert
    expect(screen.getByText(/Meus dados de clientes e estoque estão protegidos sob a LGPD/i)).toBeInTheDocument();
    expect(screen.queryByText(/Como funciona a Roleta Automática/i)).not.toBeInTheDocument();

    // Act - Busca sem resultados e botão de limpar filtros
    fireEvent.change(searchInput, { target: { value: "termo_inexistente_xyz" } });
    expect(screen.getByText(/Nenhuma pergunta encontrada com o termo/i)).toBeInTheDocument();

    const btnClear = screen.getByRole("button", { name: /Limpar filtros de busca/i });
    fireEvent.click(btnClear);

    // Assert - Volta a exibir perguntas
    expect(screen.getByText(/Como funciona a Roleta Automática/i)).toBeInTheDocument();
  });

  it("[IT-FAQ.4] Deve renderizar a Central de Ajuda (/ajuda) completa com Guia Rápido e canais de contato", () => {
    // Arrange & Act
    render(<MarketingHelpPage />);

    // Assert
    expect(
      screen.getByRole("heading", { name: /Central de Ajuda & Guia Comercial/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Como começar em menos de 15 minutos/i)).toBeInTheDocument();
    expect(screen.getByText(/Conectar Webhook de Leads/i)).toBeInTheDocument();
    expect(screen.getByText(/Cadastrar Equipe & Roleta/i)).toBeInTheDocument();
    expect(screen.getByText(/Importar Estoque \(CSV\)/i)).toBeInTheDocument();
    expect(screen.getByText(/contato@aceleraautocrm.com.br/i)).toBeInTheDocument();
  });
});
