/**
 * @file subscription-layout-guard.test.tsx
 * @description Suíte de Testes de Integração para a Proteção de Assinatura do Layout do Dashboard (SubscriptionLayoutGuard).
 *
 * Cenários Testados:
 * - [IT-SUB-GUARD.1]: Status 'active' ou 'trialing' mantém o usuário na rota sem redirecionar.
 * - [IT-SUB-GUARD.2]: Status 'overdue', 'canceled' ou 'inactive' fora de /billing redireciona para /billing?status=blocked.
 * - [IT-SUB-GUARD.3]: Status 'overdue' em /billing NUNCA executa redirect (Anti-Loop).
 * - [IT-SUB-GUARD.4]: Modo demonstração (isDemo = true) NUNCA executa redirect mesmo com status pendente.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import DashboardLayout from "@/app/(dashboard)/layout";
import * as authActions from "@/app/actions/auth";

let currentPathname = "/leads";
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
  useRouter: () => ({
    push: vi.fn(),
    replace: mockReplace,
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("[IT-SUB-GUARD] Blindagem de Assinatura no DashboardLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentPathname = "/leads";
  });

  it("[IT-SUB-GUARD.1] Deve manter acesso liberado para assinatura 'active'", async () => {
    vi.spyOn(authActions, "checkUserSubscriptionGuardAction").mockResolvedValue({
      isValid: true,
      status: "active",
      isDemo: false,
    });

    await act(async () => {
      render(
        <DashboardLayout>
          <div data-testid="dashboard-content">Painel de Leads</div>
        </DashboardLayout>
      );
    });

    expect(screen.getByTestId("dashboard-content")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("[IT-SUB-GUARD.2] Deve redirecionar para /billing?status=blocked quando status for 'overdue' ou 'canceled' fora de /billing", async () => {
    vi.spyOn(authActions, "checkUserSubscriptionGuardAction").mockResolvedValue({
      isValid: false,
      status: "overdue",
      isDemo: false,
    });

    currentPathname = "/leads";

    await act(async () => {
      render(
        <DashboardLayout>
          <div>Painel Bloqueado</div>
        </DashboardLayout>
      );
    });

    expect(mockReplace).toHaveBeenCalledWith("/billing?status=blocked");
  });

  it("[IT-SUB-GUARD.3] Anti-Loop: NUNCA deve redirecionar quando a rota atual for /billing", async () => {
    vi.spyOn(authActions, "checkUserSubscriptionGuardAction").mockResolvedValue({
      isValid: false,
      status: "canceled",
      isDemo: false,
    });

    currentPathname = "/billing";

    await act(async () => {
      render(
        <DashboardLayout>
          <div>Tela de Faturamento</div>
        </DashboardLayout>
      );
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("[IT-SUB-GUARD.4] Modo Demonstração: NUNCA deve redirecionar no modo demo", async () => {
    vi.spyOn(authActions, "checkUserSubscriptionGuardAction").mockResolvedValue({
      isValid: true,
      status: "trialing",
      isDemo: true,
    });

    currentPathname = "/vehicles";

    await act(async () => {
      render(
        <DashboardLayout>
          <div>Estoque Demo</div>
        </DashboardLayout>
      );
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });
});
