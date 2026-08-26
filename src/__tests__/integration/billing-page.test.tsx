/**
 * @file billing-page.test.tsx
 * @description Suíte de Testes de Integração para a Página de Planos e Paywall (BillingPage).
 *
 * Cenários Testados:
 * - [IT-BILL.1]: Renderização dos cards de planos (Starter, Pro, Enterprise) e alternância Mensal / Anual.
 * - [IT-BILL.2]: Renderização do rodapé de Ambiente Seguro e ativação instantânea via Pix ou Cartão de Crédito.
 * - [IT-BILL.3]: Garantir a NÃO renderização de "Garantia Incondicional" no rodapé.
 * - [IT-BILL.4]: Renderização do alerta de Paywall quando o período de testes expirar (expired=true).
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BillingPage from "@/app/(dashboard)/billing/page";

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("[IT-BILL] Página de Planos, Assinatura e Paywall (BillingPage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("[IT-BILL.1] Deve renderizar os 3 planos de assinatura e permitir alternar o ciclo de faturamento", () => {
    // Arrange & Act
    render(<BillingPage />);

    // Assert: Títulos dos planos
    expect(screen.getByText("Plano Starter")).toBeInTheDocument();
    expect(screen.getByText("Plano Pro")).toBeInTheDocument();
    expect(screen.getByText("Plano Enterprise")).toBeInTheDocument();

    // Alterna para faturamento anual
    const annualBtn = screen.getByRole("button", { name: /anual/i });
    fireEvent.click(annualBtn);

    expect(screen.getByText("2 Meses Grátis")).toBeInTheDocument();
  });

  it("[IT-BILL.2] Deve renderizar o rodapé focado em Ambiente Seguro e Métodos de Pagamento", () => {
    // Arrange & Act
    render(<BillingPage />);

    // Assert: Mensagens de segurança
    expect(
      screen.getByText(/ambiente seguro • ativação imediata via pix ou cartão de crédito/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/faturamento transparente e liberação instantânea/i)
    ).toBeInTheDocument();

    // Badges de pagamento
    expect(screen.getAllByText(/cartão de crédito/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/pix instantâneo/i).length).toBeGreaterThanOrEqual(1);
  });

  it("[IT-BILL.3] NUNCA deve renderizar o bloco de 'Garantia Incondicional de 7 Dias'", () => {
    // Arrange & Act
    render(<BillingPage />);

    // Assert: Garante a ausência total da garantia incondicional
    expect(screen.queryByText(/garantia incondicional/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/devolvemos 100%/i)).not.toBeInTheDocument();
  });

  it("[IT-BILL.4] Deve exibir o banner de Paywall estrito quando expired=true", () => {
    // Arrange
    mockSearchParams = new URLSearchParams("expired=true");

    // Act
    render(<BillingPage />);

    // Assert
    expect(screen.getByText(/período de testes expirado/i)).toBeInTheDocument();
    expect(
      screen.getByText(/seu período de teste grátis chegou ao fim/i)
    ).toBeInTheDocument();
  });
});
