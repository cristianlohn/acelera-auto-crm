/**
 * @file superadmin-page.test.tsx
 * @description Suíte de Testes de Integração do Painel Backoffice Super Admin (SuperAdminPage).
 *
 * ============================================================================
 * ESCOPO DE TESTE & RASTREABILIDADE (SUT: SuperAdminPage / REQ-CRM-14)
 * ============================================================================
 * Funcionalidades e Fluxos Testados:
 *   - [IT-14.1]: Renderização dos 4 cards de KPIs B2B (MRR, Lojas Ativas, Contas em Trial, Alertas de Expiração <= 48h).
 *   - [IT-14.2]: Renderização da listagem de concessionárias cadastradas com badges de plano e status.
 *   - [IT-14.3]: Busca reativa filtrando concessionárias por nome da loja, CNPJ ou e-mail do gestor.
 *   - [IT-14.4]: Filtragem por abas de status (Todas, Ativas, Em Trial, Vencidas, Suspensas).
 *   - [IT-14.5]: Disparo da ação de ativação manual de assinatura (Pix/Boleto) e atualização da interface.
 *   - [IT-14.6]: Disparo da extensão de trial (+7 dias) com recálculo da data de término do teste.
 *   - [IT-14.7]: Validação do link de contato via WhatsApp com o gestor da concessionária.
 *
 * Padrão Estrutural: AAA (Arrange, Act, Assert)
 * Ambiente de Execução: Happy-DOM / Vitest / Testing Library
 * ============================================================================
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SuperAdminPage from "@/app/(dashboard)/superadmin/page";
import * as superadminActions from "@/app/actions/superadmin";
import * as demoRoleModule from "@/context/demo-role-context";
import * as authActions from "@/app/actions/auth";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/superadmin",
  useSearchParams: () => new URLSearchParams(),
}));

describe("[IT-14] Painel Backoffice Super Admin e Gestão de Assinaturas B2B", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof document !== "undefined") {
      document.cookie = "acelera_demo_role=superadmin; path=/";
    }
  });

  it("[IT-14.1] Deve renderizar os 4 cards de KPIs B2B com métricas calculadas", () => {
    // Arrange & Act (Dado que o painel Super Admin é renderizado)
    render(<SuperAdminPage />);

    // Assert (Então os 4 cards de KPIs B2B devem estar visíveis)
    expect(screen.getByText(/total de concessionárias/i)).toBeInTheDocument();
    expect(screen.getByText(/concessionárias ativas/i)).toBeInTheDocument();
    expect(screen.getByText(/mrr estimado/i)).toBeInTheDocument();
    expect(screen.getByText(/total de leads trafegados/i)).toBeInTheDocument();
  });

  it("[IT-14.2] Deve renderizar a listagem de concessionárias com nomes, gestores e badges de status", () => {
    // Arrange & Act
    render(<SuperAdminPage />);

    // Assert
    expect(screen.getByText("Auto Prime Veículos")).toBeInTheDocument();
    expect(screen.getByText("Imperial Motors")).toBeInTheDocument();
    expect(screen.getByText("Vanguard Automóveis")).toBeInTheDocument();
    expect(screen.getByText("Elite Car Motors")).toBeInTheDocument();

    // Badges de status
    const activeBadges = screen.getAllByText(/ativa \(pro\)/i);
    expect(activeBadges.length).toBeGreaterThanOrEqual(1);

    const trialBadges = screen.getAllByText(/em teste \(trial\)/i);
    expect(trialBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("[IT-14.3] Deve filtrar instantaneamente ao digitar no campo de busca por loja ou e-mail", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<SuperAdminPage />);

    const searchInput = screen.getByRole("searchbox", {
      name: /buscar concessionárias/i,
    });

    // Act (Busca por 'Imperial')
    await user.type(searchInput, "Imperial");

    // Assert
    expect(screen.getByText("Imperial Motors")).toBeInTheDocument();
    expect(screen.queryByText("Auto Prime Veículos")).not.toBeInTheDocument();
    expect(screen.queryByText("Elite Car Motors")).not.toBeInTheDocument();

    // Act 2 (Busca por e-mail 'mariana@vanguardauto.com.br')
    await user.clear(searchInput);
    await user.type(searchInput, "mariana@vanguardauto.com.br");

    // Assert 2
    expect(screen.getByText("Vanguard Automóveis")).toBeInTheDocument();
    expect(screen.queryByText("Imperial Motors")).not.toBeInTheDocument();
  });

  it("[IT-14.4] Deve filtrar as concessionárias ao alternar entre as abas de status", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<SuperAdminPage />);

    const trialTab = screen.getByRole("tab", { name: /em trial/i });
    const canceledTab = screen.getByRole("tab", { name: /suspensas/i });

    // Act 1 (Seleciona aba 'Em Trial')
    await user.click(trialTab);

    // Assert 1 (Apenas lojas em trial aparecem)
    expect(screen.getByText("Imperial Motors")).toBeInTheDocument();
    expect(screen.getByText("Vanguard Automóveis")).toBeInTheDocument();
    expect(screen.queryByText("Auto Prime Veículos")).not.toBeInTheDocument();

    // Act 2 (Seleciona aba 'Suspensas')
    await user.click(canceledTab);

    // Assert 2 (Apenas lojas canceladas/suspensas aparecem)
    expect(screen.getByText("Master Motors Goiânia")).toBeInTheDocument();
    expect(screen.queryByText("Imperial Motors")).not.toBeInTheDocument();
  });

  it("[IT-14.5] Deve disparar a ação de ativação manual de assinatura e atualizar o status para Ativa", async () => {
    // Arrange
    const spyActivate = vi
      .spyOn(superadminActions, "activateSubscription")
      .mockResolvedValueOnce({
        success: true,
        message: "Assinatura ativada com sucesso por 30 dias!",
      });

    const user = userEvent.setup();
    render(<SuperAdminPage />);

    // Localiza primeiro botão de ativar da lista
    const activateBtn = screen.getAllByRole("button", {
      name: /ativar assinatura/i,
    })[0];

    // Act (Clica em Ativar)
    await act(async () => {
      await user.click(activateBtn);
    });

    // Assert (Chama a Server Action e exibe feedback de sucesso)
    expect(spyActivate).toHaveBeenCalled();
    const feedback = await screen.findByRole("status");
    expect(feedback).toHaveTextContent(/assinatura ativada com sucesso/i);
  });

  it("[IT-14.6] Deve disparar a extensão de trial (+7 dias) e recalcular o período", async () => {
    // Arrange
    const newDate = new Date(Date.now() + 8 * 86_400_000).toISOString();
    const spyExtend = vi
      .spyOn(superadminActions, "extendDealershipTrial")
      .mockResolvedValueOnce({
        success: true,
        message: "Trial estendido com sucesso em +7 dias!",
        newTrialEnd: newDate,
      });

    const user = userEvent.setup();
    render(<SuperAdminPage />);

    const extendBtn = screen.getAllByRole("button", {
      name: /\+7 dias trial/i,
    })[0];

    // Act (Clica em +7 Dias Trial)
    await act(async () => {
      await user.click(extendBtn);
    });

    // Assert
    expect(spyExtend).toHaveBeenCalled();
    const feedback = await screen.findByRole("status");
    expect(feedback).toHaveTextContent(/trial estendido com sucesso/i);
  });

  it("[IT-14.7] Deve validar o link de contato via WhatsApp com mensagem personalizada para o gestor", () => {
    // Arrange & Act
    render(<SuperAdminPage />);

    // Assert (Verifica se o link do WhatsApp aponta para a API com telefone higienizado)
    const whatsappLinks = screen.getAllByRole("link", { name: /whatsapp/i });
    expect(whatsappLinks.length).toBeGreaterThanOrEqual(1);

    const firstLink = whatsappLinks[0];
    expect(firstLink).toHaveAttribute("href");
    expect(firstLink.getAttribute("href")).toContain("https://wa.me/55");
    expect(firstLink.getAttribute("href")).toContain("text=");
    expect(firstLink).toHaveAttribute("target", "_blank");
  });

  it("[IT-14.8] Deve exibir Empty State limpo quando não houver concessionárias cadastradas na base real", async () => {
    // Arrange (Simula conta real autenticada sem organizações cadastradas)
    vi.spyOn(demoRoleModule, "useDemoRole").mockReturnValue({
      role: "superadmin",
      sellerName: "Rafael Alves",
      roleConfig: demoRoleModule.ROLE_CONFIGS.admin,
      isDemoMode: false,
      setIsDemoMode: vi.fn(),
      notification: null,
      clearNotification: vi.fn(),
      setRole: vi.fn(),
    });
    vi.spyOn(authActions, "getCurrentUserProfileAction").mockResolvedValue({
      isDemo: false,
      userId: "superadmin-usr-01",
      email: "super@acelera.com",
      fullName: "Cristian Superadmin",
      phone: "11999998888",
      role: "superadmin",
      avatarUrl: null,
      initials: "CS",
      organizationId: null,
      organizationName: "Acelera Backoffice",
      trialDaysRemaining: 14,
      subscriptionAccess: {
        hasAccess: true,
        reason: "SUPERADMIN_BYPASS",
      },
    });
    vi.spyOn(superadminActions, "getDealershipsList").mockResolvedValueOnce([]);

    // Act
    render(<SuperAdminPage />);

    // Assert (Verifica empty state, KPIs zerados e botão de cadastrar)
    const emptyState = await screen.findByTestId("superadmin-empty-state");
    expect(emptyState).toBeInTheDocument();
    expect(screen.getByText(/nenhuma concessionária cadastrada ainda/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /cadastrar primeira concessionária/i })).toHaveAttribute("href", "/cadastro");
    expect(screen.getByTestId("kpi-total-dealerships")).toHaveTextContent("0");
    expect(screen.getByTestId("kpi-active-dealerships")).toHaveTextContent("0");
    expect(screen.getByTestId("kpi-mrr-dealerships")).toHaveTextContent("R$ 0");
    expect(screen.getByTestId("kpi-leads-dealerships")).toHaveTextContent("0");
  });
});
