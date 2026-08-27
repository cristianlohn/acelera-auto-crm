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

  it("[IT-11.2] Deve renderizar a Hero Section com posicionamento comercial e duplo CTA", () => {
    // Arrange & Act
    render(<MarketingPage />);

    // Assert (Então o badge e a headline principal contra perda de leads são exibidos)
    expect(
      screen.getAllByText(/o crm que não deixa sua revenda perder leads por demora no atendimento/i).length
    ).toBeGreaterThanOrEqual(1);

    expect(
      screen.getByRole("heading", {
        name: /o crm que não deixa sua revenda perder leads por demora no atendimento/i,
      })
    ).toBeInTheDocument();

    expect(screen.getByText(/Lead entrou/i)).toBeInTheDocument();
    expect(
      screen.getByText(/vendedor precisa agir → sistema acompanha → gestor é avisado/i)
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

  it("[IT-11.4] Deve recalcular vendas e receita adicional interativamente ao alterar o slider de leads e conversão", () => {
    // Arrange (Dado o simulador com valor inicial de 200 leads, conv 2% -> 3.5% = delta 1.5%)
    render(<MarketingPage />);

    const slider = screen.getByLabelText(/leads recebidos\/mês/i);
    expect(screen.getByText("200 leads/mês")).toBeInTheDocument();
    expect(screen.getByText("+3")).toBeInTheDocument(); // 200 * 0.015 = 3 carros
    expect(screen.getByText("Como calculamos o retorno da sua revenda?")).toBeInTheDocument();

    // Act 1 (Quando o usuário altera o slider para 600 leads)
    fireEvent.change(slider, { target: { value: "600" } });
    expect(screen.getByText("600 leads/mês")).toBeInTheDocument();
    expect(screen.getByText("+9")).toBeInTheDocument();

    // Act 2 (Altera conversão atual e projetada)
    const currentConvInput = screen.getByLabelText(/conversão atual \(%\)/i);
    fireEvent.change(currentConvInput, { target: { value: "4.0" } });

    const projectedConvInput = screen.getByLabelText(/conversão com acelera \(%\)/i);
    fireEvent.change(projectedConvInput, { target: { value: "6.0" } });

    // Act 3 (Altera Ticket Médio e Margem)
    const ticketSlider = screen.getByLabelText(/ticket médio/i);
    fireEvent.change(ticketSlider, { target: { value: "100000" } });

    const marginSlider = screen.getByLabelText(/margem média bruta/i);
    fireEvent.change(marginSlider, { target: { value: "8.0" } });

    // Assert (Recalculado com 600 leads * (6.0% - 4.0% = 2.0%) = 12 carros)
    expect(screen.getByText("+12")).toBeInTheDocument();

    // Act 4: Ajusta conversão projetada para baixo da atual para testar sincronização
    fireEvent.change(projectedConvInput, { target: { value: "2.0" } });
    expect(screen.getAllByText("2%").length).toBeGreaterThanOrEqual(1);
  });

  it("[IT-11.5] Deve renderizar os 3 cartões de preços (Starter, Pro, Enterprise), limites e taxa de setup de R$ 997", () => {
    // Arrange & Act
    render(<MarketingPage />);

    // Assert (Verifica planos e valores mensais)
    expect(
      screen.getByRole("heading", { name: "Plano Starter" })
    ).toBeInTheDocument();
    expect(screen.getByText("R$ 297")).toBeInTheDocument();
    expect(screen.getByText(/até 3 vendedores inclusos/i)).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Plano Pro" })
    ).toBeInTheDocument();
    expect(screen.getByText("R$ 597")).toBeInTheDocument();
    expect(screen.getByText("Mais Popular")).toBeInTheDocument();
    expect(screen.getByText(/até 8 vendedores inclusos/i)).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Plano Enterprise" })
    ).toBeInTheDocument();
    expect(screen.getByText(/a partir de r\$ 1\.297/i)).toBeInTheDocument();
    expect(screen.getAllByText(/vendedores ilimitados/i).length).toBeGreaterThanOrEqual(1);

    // Link WhatsApp Consultor no Enterprise
    const consultorBtn = screen.getByRole("link", { name: /falar com consultor/i });
    expect(consultorBtn).toHaveAttribute("href", expect.stringContaining("wa.me"));

    // Bloco de Taxa de Setup
    expect(
      screen.getByRole("heading", { name: /implantação e onboarding guiado/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/taxa única de setup: r\$ 997/i)).toBeInTheDocument();
  });

  it("[IT-11.6] Deve alternar o toggle de periodicidade Mensal -> Anual e recalcular valores com 2 meses grátis", () => {
    // Arrange
    render(<MarketingPage />);

    // Act 1 (Clica no botão Anual)
    const annualBtn = screen.getByRole("button", { name: /anual/i });
    fireEvent.click(annualBtn);

    // Assert 1 (Verifica valores anuais com desconto de 2 meses grátis)
    expect(screen.getByText("R$ 2.970")).toBeInTheDocument();
    expect(screen.getByText("R$ 5.970")).toBeInTheDocument();
    expect(screen.getAllByText("/ano").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/2 meses grátis/i)).toBeInTheDocument();

    // Act 2 (Clica de volta no botão Mensal)
    const monthlyBtn = screen.getByRole("button", { name: /^mensal$/i });
    fireEvent.click(monthlyBtn);

    // Assert 2 (Verifica restauração dos valores mensais)
    expect(screen.getByText("R$ 297")).toBeInTheDocument();
    expect(screen.getByText("R$ 597")).toBeInTheDocument();
    expect(screen.getAllByText("/mês").length).toBeGreaterThanOrEqual(2);
  });

  it("[IT-11.7] Deve conter links de direcionamento válidos para a rota do CRM (/leads)", () => {
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
