/**
 * @file verified-account-toast.test.tsx
 * @description Testes de Integração para o Toast de Conta/E-mail Verificado (VerifiedAccountToast).
 *
 * Cenários Testados:
 * - [IT-TOAST.1]: Não renderiza nada quando o parâmetro `verified` não estiver presente.
 * - [IT-TOAST.2]: Renderiza a mensagem em verde esmeralda quando `verified=true`.
 * - [IT-TOAST.3]: Permite fechamento manual via botão de fechar (X).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { VerifiedAccountToast } from "@/components/dashboard/VerifiedAccountToast";

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

describe("[IT-TOAST] Feedback de Conta Verificada (VerifiedAccountToast)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("[IT-TOAST.1] Não deve exibir notificação quando verified não for true", () => {
    // Arrange & Act
    const { container } = render(<VerifiedAccountToast />);

    // Assert
    expect(container).toBeEmptyDOMElement();
  });

  it("[IT-TOAST.2] Deve exibir notificação quando verified=true", () => {
    // Arrange
    mockSearchParams = new URLSearchParams("verified=true");

    // Act
    render(<VerifiedAccountToast />);

    // Assert
    expect(
      screen.getByText(/conta e e-mail verificados com sucesso/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/bem-vindo ao acelera auto crm/i)
    ).toBeInTheDocument();
  });

  it("[IT-TOAST.3] Deve permitir fechar a notificação ao clicar no botão X", () => {
    // Arrange
    mockSearchParams = new URLSearchParams("verified=true");
    render(<VerifiedAccountToast />);

    const closeBtn = screen.getByRole("button", { name: /fechar notificação/i });

    // Act
    act(() => {
      fireEvent.click(closeBtn);
    });

    // Assert
    expect(
      screen.queryByText(/conta e e-mail verificados com sucesso/i)
    ).not.toBeInTheDocument();
  });
});
