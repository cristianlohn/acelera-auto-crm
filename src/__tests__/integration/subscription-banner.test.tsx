/**
 * @file subscription-banner.test.tsx
 * @description Testes de Integração para o SubscriptionBanner (Aviso de Trial e Alerta de Inadimplência).
 *
 * Cenários Testados:
 * - [IT-SB.1]: Não renderiza nada quando o status for nulo ou assinatura estiver ativa.
 * - [IT-SB.2]: Renderiza banner de trial ativo com contagem de dias restantes e botão CTA.
 * - [IT-SB.3]: Renderiza alerta de pendência financeira para status PAST_DUE_GRACE.
 * - [IT-SB.4]: Permite fechar o banner de trial ao clicar no botão X.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SubscriptionBanner } from "@/components/dashboard/SubscriptionBanner";
import { DemoRoleProvider } from "@/context/demo-role-context";
import * as authActions from "@/app/actions/auth";

describe("[IT-SB] Banner de Ciclo de Vida da Assinatura (SubscriptionBanner)", () => {
  it("[IT-SB.1] Não deve renderizar quando o status for nulo ou assinatura regular", async () => {
    // Arrange
    vi.spyOn(authActions, "getSubscriptionStatusAction").mockResolvedValue({
      hasAccess: true,
      reason: "ACTIVE_SUBSCRIPTION",
    });

    // Act
    let c1: HTMLElement;
    await act(async () => {
      const res = render(<SubscriptionBanner />);
      c1 = res.container;
    });
    expect(c1!).toBeEmptyDOMElement();

    let c2: HTMLElement;
    await act(async () => {
      const res = render(
        <SubscriptionBanner status={{ hasAccess: true, reason: "ACTIVE_SUBSCRIPTION" }} />
      );
      c2 = res.container;
    });
    expect(c2!).toBeEmptyDOMElement();
  });

  it("[IT-SB.2] Deve renderizar banner de trial ativo com dias restantes e link para /billing", () => {
    // Arrange & Act
    render(
      <SubscriptionBanner
        status={{ hasAccess: true, reason: "TRIAL_ACTIVE", daysRemaining: 5 }}
      />
    );

    // Assert
    expect(screen.getByText(/período de testes:/i)).toBeInTheDocument();
    expect(screen.getByText(/5 dias/i)).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /ativar plano definitivo/i });
    expect(cta).toHaveAttribute("href", "/billing");
  });

  it("[IT-SB.3] Deve renderizar alerta de pendência financeira para status PAST_DUE_GRACE", () => {
    // Arrange & Act
    render(
      <SubscriptionBanner
        status={{ hasAccess: true, reason: "PAST_DUE_GRACE", warning: true }}
      />
    );

    // Assert
    expect(screen.getByText(/pendência financeira:/i)).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /regularizar agora/i });
    expect(cta).toHaveAttribute("href", "/billing");
  });

  it("[IT-SB.4] Deve permitir fechar o banner de trial ao clicar no botão de fechar", () => {
    // Arrange
    render(
      <SubscriptionBanner
        status={{ hasAccess: true, reason: "TRIAL_ACTIVE", daysRemaining: 3 }}
      />
    );

    const closeBtn = screen.getByRole("button", { name: /fechar banner de trial/i });

    // Act
    act(() => {
      fireEvent.click(closeBtn);
    });

    // Assert
    expect(screen.queryByText(/período de testes:/i)).not.toBeInTheDocument();
  });

  it("[IT-SB.5] Deve renderizar exatamente '14 dias' para novas concessionárias no primeiro dia de trial", () => {
    // Arrange & Act
    render(
      <SubscriptionBanner
        status={{ hasAccess: true, reason: "TRIAL_ACTIVE", daysRemaining: 14 }}
      />
    );

    // Assert
    expect(screen.getByText(/período de testes:/i)).toBeInTheDocument();
    expect(screen.getByText(/14 dias/i)).toBeInTheDocument();
  });

  it("[IT-SB.6] Não deve renderizar banner de trial quando em Modo Demonstração (isDemoMode = true)", () => {
    // Arrange & Act
    const { container } = render(
      <DemoRoleProvider initialDemoMode={true} initialRole="admin">
        <SubscriptionBanner
          status={{ hasAccess: true, reason: "TRIAL_ACTIVE", daysRemaining: 10 }}
        />
      </DemoRoleProvider>
    );

    // Assert
    expect(container).toBeEmptyDOMElement();
  });
});

