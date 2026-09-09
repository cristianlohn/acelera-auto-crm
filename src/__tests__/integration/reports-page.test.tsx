/**
 * @file reports-page.test.tsx
 * @description Suíte de Testes de Integração da Página de Relatórios e Indicadores Comerciais (ReportsPage).
 *
 * ============================================================================
 * ESCOPO DE TESTE & RASTREABILIDADE (SUT: ReportsPage)
 * ============================================================================
 * Funcionalidades e Fluxos Testados:
 *   - [IT-08.1]: Renderização dos 4 cards de KPIs executivos com valores monetários e percentuais.
 *   - [IT-08.2]: Alternância reativa de períodos nos filtros (7 dias, Este Mês, Trimestre, Ano).
 *   - [IT-08.3]: Renderização das 5 etapas do funil de conversão comercial com contagem e taxas de passagem.
 *   - [IT-08.4]: Exibição do ranking da equipe de vendedores com destaque visual para o Top 1.
 *   - [IT-08.5]: Renderização da eficiência por canais de aquisição de leads (WhatsApp, Instagram, etc.).
 *   - [IT-08.6]: Disparo da ação de exportação com feedback visual temporário ao usuário.
 *   - [IT-08.7]: Renderização dos veículos líderes em vendas e giro de pátio.
 *   - [IT-08.8]: Recálculo e atualização dinâmica de valores de receita e funil ao mudar de período.
 *
 * Padrão Estrutural: AAA (Arrange, Act, Assert)
 * Ambiente de Execução: Happy-DOM / Vitest / Testing Library
 * ============================================================================
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReportsPage from "@/app/(dashboard)/reports/page";
import { DemoRoleProvider } from "@/context/demo-role-context";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/reports",
  useSearchParams: () => new URLSearchParams(),
}));

// ---------------------------------------------------------------------------
// [IT-08] Módulo de Relatórios e Indicadores Comerciais
// ---------------------------------------------------------------------------

describe("[IT-08] Relatórios e Indicadores Comerciais (ReportsPage)", () => {
  it("[IT-08.1] Deve renderizar os 4 cards de KPIs executivos com formatação BRL e taxas percentuais", () => {
    // Arrange & Act (Dado que a página de Relatórios é montada)
    render(
      <DemoRoleProvider initialDemoMode={true}>
        <ReportsPage />
      </DemoRoleProvider>
    );

    // Assert (Então os 4 KPIs executivos devem estar presentes com seus respectivos valores)
    expect(screen.getByText("Faturamento Realizado")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?215\.800/)).toBeInTheDocument();

    expect(screen.getByText("Taxa de Conversão Global")).toBeInTheDocument();
    expect(screen.getByText("12.5%")).toBeInTheDocument();

    expect(screen.getByText("Ticket Médio por Veículo")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?71\.933/)).toBeInTheDocument();

    expect(screen.getByText("Tempo Médio de Resposta (SLA)")).toBeInTheDocument();
    expect(screen.getByText("8 min")).toBeInTheDocument();
  });

  it("[IT-08.2] Deve alternar entre os filtros de período (7 dias, Este Mês, Trimestre, Ano) atualizando o estado ativo", async () => {
    // Arrange (Dado o dashboard montado no período padrão 'Este Mês')
    const user = userEvent.setup();
    render(
      <DemoRoleProvider initialDemoMode={true}>
        <ReportsPage />
      </DemoRoleProvider>
    );

    const monthTab = screen.getByRole("tab", { name: "Este Mês" });
    const sevenDaysTab = screen.getByRole("tab", { name: "7 dias" });
    const quarterTab = screen.getByRole("tab", { name: "Trimestre" });
    const yearTab = screen.getByRole("tab", { name: "Ano" });

    expect(monthTab).toHaveAttribute("aria-selected", "true");
    expect(sevenDaysTab).toHaveAttribute("aria-selected", "false");

    // Act 1 (Quando o usuário clica no filtro '7 dias')
    await user.click(sevenDaysTab);

    // Assert 1 (Então '7 dias' passa a ser o ativo e o faturamento atualiza)
    expect(sevenDaysTab).toHaveAttribute("aria-selected", "true");
    expect(monthTab).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText(/R\$\s?539\.600/)).toBeInTheDocument();

    // Act 2 (Quando o usuário clica no filtro 'Trimestre')
    await user.click(quarterTab);

    // Assert 2 (Então 'Trimestre' fica ativo e exibe a receita trimestral)
    expect(quarterTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/R\$\s?5\.420\.000/)).toBeInTheDocument();

    // Act 3 (Quando o usuário clica em 'Ano')
    await user.click(yearTab);

    // Assert 3 (Então 'Ano' fica ativo e exibe a receita anual)
    expect(yearTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/R\$\s?19\.800\.000/)).toBeInTheDocument();
  });

  it("[IT-08.3] Deve renderizar as 5 etapas do funil de conversão comercial com contagem e taxas de avanço", () => {
    // Arrange & Act (Quando o dashboard é carregado)
    render(
      <DemoRoleProvider initialDemoMode={true}>
        <ReportsPage />
      </DemoRoleProvider>
    );

    // Assert (Então as 5 etapas com contagem de leads devem estar presentes)
    expect(screen.getByText("Novo Lead")).toBeInTheDocument();
    expect(screen.getByText("Em Atendimento")).toBeInTheDocument();
    expect(screen.getByText("Visita / Test-Drive")).toBeInTheDocument();
    expect(screen.getByText("Proposta")).toBeInTheDocument();
    expect(screen.getByText("Venda Fechada")).toBeInTheDocument();

    // Valida contagem de leads no período mensal padrão (24 leads)
    expect(screen.getByText("24 leads")).toBeInTheDocument();
    expect(screen.getByText("18 leads")).toBeInTheDocument();
    expect(screen.getByText("10 leads")).toBeInTheDocument();
    expect(screen.getByText("6 leads")).toBeInTheDocument();
    expect(screen.getByText("3 leads")).toBeInTheDocument();

    // Valida taxas de passagem
    expect(screen.getByText("75% conv.")).toBeInTheDocument();
    expect(screen.getByText("55.6% conv.")).toBeInTheDocument();
    expect(screen.getByText("60% conv.")).toBeInTheDocument();
    expect(screen.getByText("50% conv.")).toBeInTheDocument();
  });

  it("[IT-08.4] Deve renderizar o ranking de vendedores com destaque visual e coroa no Top 1", () => {
    // Arrange & Act (Quando a seção da equipe comercial é renderizada)
    render(
      <DemoRoleProvider initialDemoMode={true}>
        <ReportsPage />
      </DemoRoleProvider>
    );

    // Assert (Então o Top 1 deve ter badge exclusiva e dados individuais)
    expect(screen.getByText("Ranking da Equipe Comercial")).toBeInTheDocument();
    expect(screen.getByText("Rafael Alves")).toBeInTheDocument();
    expect(screen.getByText("Top 1")).toBeInTheDocument();
    expect(screen.getByTitle("Top 1 Campeão de Vendas")).toBeInTheDocument();

    // Outros vendedores da equipe
    expect(screen.getByText("Camila Dias")).toBeInTheDocument();
    expect(screen.getByText("Lucas Santana")).toBeInTheDocument();
    expect(screen.getByText("Beatriz Rocha")).toBeInTheDocument();

    // Valida métricas do líder no mês (Rafael Alves: 2 vendas, R$ 142.900)
    expect(screen.getByText(/2 vendas concluídas/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?142\.900/)).toBeInTheDocument();
  });

  it("[IT-08.5] Deve renderizar a lista de eficiência por canais de aquisição com percentuais", () => {
    // Arrange & Act
    render(
      <DemoRoleProvider initialDemoMode={true}>
        <ReportsPage />
      </DemoRoleProvider>
    );

    // Assert (Então os canais e suas taxas devem ser exibidos)
    expect(screen.getByText("Desempenho por Canal")).toBeInTheDocument();
    expect(screen.getByText("Canal / Origem")).toBeInTheDocument();
    expect(screen.getByText("Leads Recebidos")).toBeInTheDocument();
    expect(screen.getByText("Vendas Concluídas")).toBeInTheDocument();
    expect(screen.getByText("Taxa de Conversão (%)")).toBeInTheDocument();

    expect(screen.getAllByText("WhatsApp")[0]).toBeInTheDocument();
    expect(screen.getByText("Instagram")).toBeInTheDocument();
    expect(screen.getByText("Site Próprio")).toBeInTheDocument();
    expect(screen.getByText("OLX")).toBeInTheDocument();
    expect(screen.getByText("Indicação")).toBeInTheDocument();

    // Taxa de conversão do WhatsApp
    expect(screen.getByText("10%")).toBeInTheDocument();

    // Insight dinâmico de canal com maior conversão
    expect(
      screen.getByText(
        "Canal com maior taxa de conversão: OLX (33,3%), seguido por Site Próprio (25,0%)."
      )
    ).toBeInTheDocument();
  });

  it("[IT-08.6] Deve disparar a ação de exportação de relatório e exibir feedback visual ao usuário", () => {
    // Arrange
    vi.useFakeTimers();
    render(
      <DemoRoleProvider initialDemoMode={true}>
        <ReportsPage />
      </DemoRoleProvider>
    );

    const exportBtn = screen.getByRole("button", {
      name: /exportar relatório consolidado/i,
    });
    expect(exportBtn).toBeInTheDocument();
    expect(screen.getByText("Exportar Relatório")).toBeInTheDocument();

    // Act (Quando o usuário clica em exportar)
    act(() => {
      fireEvent.click(exportBtn);
    });

    // Avança o timer da simulação
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Assert (Então o feedback de sucesso deve ser exibido)
    expect(
      screen.getByText("Relatório Exportado com Sucesso!")
    ).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("[IT-08.7] Deve renderizar a lista de veículos mais vendidos e giro de pátio", () => {
    // Arrange & Act
    render(
      <DemoRoleProvider initialDemoMode={true}>
        <ReportsPage />
      </DemoRoleProvider>
    );

    // Assert (Verifica a presença dos modelos canônicos da demo)
    expect(screen.getByText("Veículos Mais Vendidos")).toBeInTheDocument();
    expect(screen.getByText("Honda Civic")).toBeInTheDocument();
    expect(screen.getByText("Chevrolet Tracker")).toBeInTheDocument();
    expect(screen.getByText("Ford Ka")).toBeInTheDocument();

    expect(screen.getAllByText(/1 unidade/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/R\$\s?90\.000/)).toBeInTheDocument();
  });

  it("[IT-08.9] Deve exibir zeros reais e Empty State limpo para organização real sem vendas", () => {
    // Arrange & Act (Organização real sem sessão demo)
    render(
      <DemoRoleProvider initialDemoMode={false} initialRole="admin">
        <ReportsPage />
      </DemoRoleProvider>
    );

    // Assert (KPIs zerados em produção sem cair em mock)
    expect(screen.getByText("Faturamento Realizado")).toBeInTheDocument();
    expect(screen.getAllByText(/R\$\s?0/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getAllByText("0 min").length).toBeGreaterThanOrEqual(1);

    // Veículos mais vendidos: Empty state limpo
    expect(
      screen.getByText("Nenhuma venda consolidada no período selecionado.")
    ).toBeInTheDocument();

    // Rafael Alves ou Honda Civic não devem aparecer em organização real vazia
    expect(screen.queryByText("Rafael Alves")).not.toBeInTheDocument();
    expect(screen.queryByText("Honda Civic")).not.toBeInTheDocument();
  });
});
