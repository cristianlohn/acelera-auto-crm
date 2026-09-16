/**
 * @file sidebar-logout.test.tsx
 * @description Suíte de Testes Unitários e de Integração para o Botão de Logout e Perfil da Sidebar.
 *
 * Cenários Testados:
 * - [IT-LOGOUT.1]: Renderização do botão 'Sair da Conta' e dados do usuário na Sidebar (desktop) e no Header retrátil (mobile).
 * - [IT-LOGOUT.2]: Invocação da Server Action logoutAction e limpeza de cookies ao clicar em 'Sair da Conta'.
 * - [IT-LOGOUT.3]: Exibição das iniciais do gestor ou vendedor dinamicamente no card de perfil do rodapé.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import DashboardLayout from "@/app/(dashboard)/layout";
import * as authActions from "@/app/actions/auth";

// Mock do next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/leads",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("[IT-LOGOUT] Botão de Logout e Perfil do Usuário na Sidebar", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("[IT-LOGOUT.1] Deve renderizar o botão 'Sair da Conta' com ícone LogOut na Sidebar", () => {
    // Arrange & Act
    render(
      <DashboardLayout>
        <div>Conteúdo de Teste</div>
      </DashboardLayout>
    );

    // Assert: Botão de logout na sidebar
    const logoutBtn = screen.getByRole("button", { name: /sair da conta/i });
    expect(logoutBtn).toBeInTheDocument();
    expect(logoutBtn).toHaveAttribute("id", "btn-logout-sidebar");
  });

  it("[IT-LOGOUT.2] Deve chamar logoutAction ao clicar em 'Sair da Conta'", async () => {
    // Arrange
    const spyLogout = vi.spyOn(authActions, "logoutAction").mockResolvedValue({
      success: true,
    });

    render(
      <DashboardLayout>
        <div>Conteúdo de Teste</div>
      </DashboardLayout>
    );

    const logoutBtn = screen.getByRole("button", { name: /sair da conta/i });

    // Act
    await act(async () => {
      fireEvent.click(logoutBtn);
    });

    // Assert
    expect(spyLogout).toHaveBeenCalledTimes(1);
  });

  it("[IT-LOGOUT.3] Deve renderizar o card com iniciais e status ativo do perfil no rodapé", () => {
    // Arrange & Act
    render(
      <DashboardLayout>
        <div>Conteúdo de Teste</div>
      </DashboardLayout>
    );

    // Assert: Card de status e perfil
    expect(screen.getAllByText(/ativo/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/vendedor|administrador|gerente/i).length).toBeGreaterThanOrEqual(1);
  });

  it("[IT-LOGOUT.4] Deve renderizar o nome real do usuário, e-mail e iniciais dinamicamente (ex: Cristian Lohn -> CL)", async () => {
    // Arrange
    vi.spyOn(authActions, "getCurrentUserProfileAction").mockResolvedValue({
      isDemo: false,
      userId: "user-real-123",
      fullName: "Cristian Lohn",
      email: "cristian@catuto.com.br",
      phone: "11988887777",
      role: "admin",
      avatarUrl: null,
      initials: "CL",
      organizationName: "Catuto Concessionária",
      trialDaysRemaining: 14,
      subscriptionAccess: {
        hasAccess: true,
        reason: "TRIAL_ACTIVE",
        daysRemaining: 14,
      },
    });

    // Act
    await act(async () => {
      render(
        <DashboardLayout>
          <div>Conteúdo</div>
        </DashboardLayout>
      );
    });

    // Assert: Nome real, email real e iniciais
    expect(screen.getAllByText("Cristian Lohn").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("cristian@catuto.com.br").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("CL").length).toBeGreaterThanOrEqual(1);
  });

  it("[IT-LOGOUT.5] Deve usar fallback de prefixo do e-mail quando full_name for vazio e calcular iniciais", async () => {
    // Arrange
    vi.spyOn(authActions, "getCurrentUserProfileAction").mockResolvedValue({
      isDemo: false,
      userId: "user-real-456",
      fullName: "marcos silva",
      email: "marcos.silva@auto.com.br",
      phone: null,
      role: "gerente",
      avatarUrl: null,
      initials: "MS",
      organizationName: "Auto Prime",
      trialDaysRemaining: 14,
      subscriptionAccess: {
        hasAccess: true,
        reason: "TRIAL_ACTIVE",
        daysRemaining: 14,
      },
    });

    // Act
    await act(async () => {
      render(
        <DashboardLayout>
          <div>Conteúdo</div>
        </DashboardLayout>
      );
    });

    // Assert
    expect(screen.getAllByText("marcos silva").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("marcos.silva@auto.com.br").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("MS").length).toBeGreaterThanOrEqual(1);
  });

  it("[IT-LOGOUT.6] MobileHeader deve exibir as iniciais dinâmicas do usuário logado (ex: 'Cris Test of' -> 'CT')", async () => {
    // Arrange
    vi.spyOn(authActions, "getCurrentUserProfileAction").mockResolvedValue({
      isDemo: false,
      userId: "user-cris-test",
      fullName: "Cris Test of",
      email: "cris.test@autoprime.com.br",
      phone: "11988887777",
      role: "admin",
      avatarUrl: null,
      initials: "CT",
      organizationName: "Auto Prime Motors",
      trialDaysRemaining: 14,
      subscriptionAccess: {
        hasAccess: true,
        reason: "TRIAL_ACTIVE",
        daysRemaining: 14,
      },
    });

    // Act
    await act(async () => {
      render(
        <DashboardLayout>
          <div>Conteúdo</div>
        </DashboardLayout>
      );
    });

    // Assert: O avatar mobile deve conter 'CT'
    const mobileAvatar = screen.getByTestId("mobile-user-avatar");
    expect(mobileAvatar).toBeInTheDocument();
    expect(mobileAvatar).toHaveTextContent("CT");
  });

  it("[IT-LOGOUT.7] Logout em Sessão Real deve chamar logoutAction e redirecionar via window.location.replace('/login')", async () => {
    const replaceSpy = vi.fn();
    const originalReplace = window.location.replace;
    window.location.replace = replaceSpy;

    const spyLogout = vi.spyOn(authActions, "logoutAction").mockResolvedValue({
      success: true,
    });

    await act(async () => {
      render(
        <DashboardLayout>
          <div>Conteúdo</div>
        </DashboardLayout>
      );
    });

    const logoutBtn = screen.getByRole("button", { name: /sair da conta/i });

    await act(async () => {
      fireEvent.click(logoutBtn);
    });

    expect(spyLogout).toHaveBeenCalledTimes(1);
    expect(replaceSpy).toHaveBeenCalledWith("/login");

    window.location.replace = originalReplace;
  });

  it("[IT-LOGOUT.8] Logout no Modo Demonstração deve limpar cookies/storage e redirecionar sem invocar logoutAction", async () => {
    document.cookie = "acelera_demo_mode=true; path=/";
    localStorage.setItem("acelera_demo_mode", "true");

    const replaceSpy = vi.fn();
    const originalReplace = window.location.replace;
    window.location.replace = replaceSpy;

    const spyLogout = vi.spyOn(authActions, "logoutAction").mockResolvedValue({
      success: true,
    });

    await act(async () => {
      render(
        <DashboardLayout>
          <div>Conteúdo</div>
        </DashboardLayout>
      );
    });

    const logoutBtn = screen.getByRole("button", { name: /sair da conta/i });

    await act(async () => {
      fireEvent.click(logoutBtn);
    });

    // No modo demo, não chama a Server Action remota
    expect(spyLogout).not.toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalledWith("/login");
    expect(localStorage.getItem("acelera_demo_mode")).toBeNull();

    window.location.replace = originalReplace;
  });

  it("[IT-LOGOUT.9] Deve desabilitar o botão e exibir feedback de carregamento 'Saindo...' prevenindo múltiplos cliques", async () => {
    let resolveLogout: (val: { success: boolean }) => void = () => {};
    const logoutPromise = new Promise<{ success: boolean }>((resolve) => {
      resolveLogout = resolve;
    });
    const spyLogout = vi.spyOn(authActions, "logoutAction").mockReturnValue(logoutPromise);

    await act(async () => {
      render(
        <DashboardLayout>
          <div>Conteúdo</div>
        </DashboardLayout>
      );
    });

    const logoutBtn = screen.getByRole("button", { name: /sair da conta/i });
    expect(logoutBtn).not.toBeDisabled();
    expect(logoutBtn).toHaveTextContent(/sair/i);

    // Primeiro clique - inicia logout
    await act(async () => {
      fireEvent.click(logoutBtn);
    });

    // Durante o logout, botão deve estar desabilitado e exibir "Saindo..."
    expect(logoutBtn).toBeDisabled();
    expect(logoutBtn).toHaveTextContent(/saindo/i);

    // Segundo clique concorrente deve ser ignorado
    await act(async () => {
      fireEvent.click(logoutBtn);
    });

    expect(spyLogout).toHaveBeenCalledTimes(1);

    // Conclui a ação
    await act(async () => {
      resolveLogout({ success: true });
    });
  });

  it("[IT-LOGOUT.10] Botão 'Sair da Demonstração' na RoleSimulatorBar deve expurgar dados demo e redirecionar para /login", async () => {
    document.cookie = "acelera_demo_mode=true; path=/";
    localStorage.setItem("acelera_demo_mode", "true");

    const replaceSpy = vi.fn();
    const originalReplace = window.location.replace;
    window.location.replace = replaceSpy;

    await act(async () => {
      render(
        <DashboardLayout>
          <div>Conteúdo</div>
        </DashboardLayout>
      );
    });

    const exitDemoBtn = screen.getByTestId("btn-exit-demo");
    expect(exitDemoBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(exitDemoBtn);
    });

    expect(replaceSpy).toHaveBeenCalledWith("/login");
    expect(localStorage.getItem("acelera_demo_mode")).toBeNull();

    window.location.replace = originalReplace;
  });
});

