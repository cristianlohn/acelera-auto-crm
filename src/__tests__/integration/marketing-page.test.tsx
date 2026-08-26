/**
 * @file marketing-page.test.tsx
 * @description Suíte de Testes de Integração do Portal Institucional e Vendas (MarketingLayout & MarketingPage).
 *
 * ============================================================================
 * ESCOPO DE TESTE & RASTREABILIDADE (SUT: MarketingPage & Layout)
 * ============================================================================
 * Funcionalidades e Fluxos Testados:
 *   - [IT-11.1]: Renderização do Header com Logo, links de navegação por âncora e botões de ação (Entrar e Testar).
 *   - [IT-11.2]: Renderização da Hero Section com badge de lançamento, headline de conversão e duplo CTA.
 *   - [IT-11.3]: Validação da exibição dos 4 cards de funcionalidades no Bento Grid (Kanban, Estoque, WhatsApp, Relatórios).
 *   - [IT-11.4]: Interatividade da calculadora de retorno comercial ao alterar o slider de leads mensais.
 *   - [IT-11.5]: Renderização dos 3 cartões de planos e preços (Starter, Pro, Enterprise) com valores e diferenciais.
 *   - [IT-11.6]: Validação de todos os links de redirecionamento para o ambiente do CRM (/leads).
 *
 * Padrão Estrutural: AAA (Arrange, Act, Assert)
 * Ambiente de Execução: Happy-DOM / Vitest / Testing Library
 * ============================================================================
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MarketingLayout from "@/app/(marketing)/layout";
import MarketingPage from "@/app/(marketing)/page";

// ---------------------------------------------------------------------------
// [IT-11] Website Institucional e Landing Page de Vendas
// ---------------------------------------------------------------------------

describe("[IT-11] Portal Institucional e Landing Page (Marketing)", () => {
  it("[IT-11.1] Deve renderizar o Header com Logo, links de navegação e botões de CTA", () => {
    // Arrange & Act (Dado que o layout de Marketing é renderizado)
    render(
      <MarketingLayout>
        <MarketingPage />
      </MarketingLayout>
    );

    // Assert (Então a navegação e o logo devem estar presentes)
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /acelera auto crm página inicial/i })
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Recursos" })).toHaveAttribute(
      "href",
      "#recursos"
    );
    expect(screen.getByRole("link", { name: "Planos" })).toHaveAttribute(
      "href",
      "#planos"
    );

    expect(
      screen.getByRole("button", { name: /entrar no crm/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /testar demonstração grátis/i })
    ).toBeInTheDocument();
  });

  it("[IT-11.2] Deve renderizar a Hero Section com badge de lançamento, headline de conversão e duplo CTA", () => {
    // Arrange & Act
    render(<MarketingPage />);

    // Assert (Então a headline principal e os CTAs de topo são exibidos)
    expect(
      screen.getByText(/integração direta com whatsapp e funil kanban/i)
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: /o crm automotivo construído para acelerar o fechamento de vendas de veículos/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /experimentar demonstração gratuita/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /agendar tour guiado/i,
      })
    ).toBeInTheDocument();
  });

  it("[IT-11.3] Deve renderizar os 4 cards de funcionalidades no Bento Grid", () => {
    // Arrange & Act
    render(<MarketingPage />);

    // Assert (Verifica a presença dos 4 pilares do sistema)
    expect(
      screen.getByRole("heading", {
        name: /funil kanban visual com sla de atendimento/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: /gestão inteligente de pátio e estoque/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: /botão de ação imediata whatsapp/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: /relatórios executivos e métricas em tempo real/i,
      })
    ).toBeInTheDocument();
  });

  it("[IT-11.4] Deve recalcular vendas e receita adicional interativamente ao alterar o slider de leads", () => {
    // Arrange (Dado o simulador com valor inicial de 200 leads)
    render(<MarketingPage />);

    const slider = screen.getByLabelText(
      /quantos leads sua loja recebe por mês\?/i
    );
    expect(screen.getByText("200 leads/mês")).toBeInTheDocument();
    expect(screen.getByText("+16")).toBeInTheDocument(); // 200 * 0.08 = 16 carros

    // Act (Quando o usuário altera o slider para 500 leads)
    fireEvent.change(slider, { target: { value: "500" } });

    // Assert (Então as estimativas devem ser recalculadas para 40 carros)
    expect(screen.getByText("500 leads/mês")).toBeInTheDocument();
    expect(screen.getByText("+40")).toBeInTheDocument(); // 500 * 0.08 = 40 carros
  });

  it("[IT-11.5] Deve renderizar os 3 cartões de preços (Starter, Pro, Enterprise) com valores e badges", () => {
    // Arrange & Act
    render(<MarketingPage />);

    // Assert (Verifica planos e valores)
    expect(
      screen.getByRole("heading", { name: "Plano Starter" })
    ).toBeInTheDocument();
    expect(screen.getByText("R$ 197")).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Plano Pro" })
    ).toBeInTheDocument();
    expect(screen.getByText("R$ 497")).toBeInTheDocument();
    expect(screen.getByText("Mais Escolhido")).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Plano Enterprise" })
    ).toBeInTheDocument();
    expect(screen.getByText("Sob Consulta")).toBeInTheDocument();
  });

  it("[IT-11.6] Deve conter links de direcionamento válidos para a rota do CRM (/leads)", () => {
    // Arrange & Act
    render(
      <MarketingLayout>
        <MarketingPage />
      </MarketingLayout>
    );

    // Assert (Verifica que múltiplos CTAs apontam para /leads)
    const links = screen.getAllByRole("link");
    const leadsLinks = links.filter(
      (link) => link.getAttribute("href") === "/leads"
    );

    expect(leadsLinks.length).toBeGreaterThanOrEqual(4);
  });
});
