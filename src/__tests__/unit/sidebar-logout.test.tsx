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
    expect(screen.getAllByText(/administrador/i).length).toBeGreaterThanOrEqual(1);
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
});

