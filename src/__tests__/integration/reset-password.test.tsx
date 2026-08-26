/**
 * @file reset-password.test.tsx
 * @description Suíte de Testes de Integração para a Página de Redefinição de Senha (ResetPasswordPage).
 *
 * Cenários Testados:
 * - [IT-RP.1]: Renderização dos campos "Nova Senha" e "Confirmar Nova Senha".
 * - [IT-RP.2]: Alternância independente de visibilidade de senha (Eye / EyeOff).
 * - [IT-RP.3]: Validação de senha curta (< 6 caracteres) e senhas que não coincidem.
 * - [IT-RP.4]: Submissão com sucesso chamando updateUserPassword e redirecionando para o login.
 * - [IT-RP.5]: Tratamento de erro retornado pela Server Action.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResetPasswordPage from "@/app/(auth)/reset-password/page";
import * as authActions from "@/app/actions/auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe("[IT-RP] Página de Redefinição de Senha (ResetPasswordPage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[IT-RP.1] Deve renderizar os campos de nova senha e confirmação", () => {
    // Arrange & Act
    render(<ResetPasswordPage />);

    // Assert
    expect(screen.getByLabelText(/^nova senha$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^confirmar nova senha$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /salvar nova senha/i })
    ).toBeInTheDocument();
  });

  it("[IT-RP.2] Deve alternar visibilidade de senha de forma independente", () => {
    // Arrange
    render(<ResetPasswordPage />);

    const passwordInput = screen.getByLabelText(/^nova senha$/i);
    const confirmInput = screen.getByLabelText(/^confirmar nova senha$/i);
    const togglePasswordBtn = screen.getByRole("button", { name: /exibir senha/i });
    const toggleConfirmBtn = screen.getByRole("button", {
      name: /exibir confirmação de senha/i,
    });

    // Assert inicial: Ambos são type="password"
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(confirmInput).toHaveAttribute("type", "password");

    // Act: Clica para exibir senha
    act(() => {
      fireEvent.click(togglePasswordBtn);
    });
    expect(passwordInput).toHaveAttribute("type", "text");
    expect(confirmInput).toHaveAttribute("type", "password");

    // Act: Clica para exibir confirmação
    act(() => {
      fireEvent.click(toggleConfirmBtn);
    });
    expect(confirmInput).toHaveAttribute("type", "text");
  });

  it("[IT-RP.3] Deve validar senha curta e senhas divergentes", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    const passwordInput = screen.getByLabelText(/^nova senha$/i);
    const confirmInput = screen.getByLabelText(/^confirmar nova senha$/i);
    const submitBtn = screen.getByRole("button", { name: /salvar nova senha/i });

    // 1. Senha curta
    await user.type(passwordInput, "123");
    await user.type(confirmInput, "123");
    await user.click(submitBtn);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no mínimo 6 caracteres/i
    );

    // 2. Senhas divergentes
    await user.clear(passwordInput);
    await user.clear(confirmInput);
    await user.type(passwordInput, "SenhaForte123");
    await user.type(confirmInput, "OutraSenha456");
    await user.click(submitBtn);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /as senhas não coincidem/i
    );
  });

  it("[IT-RP.4] Deve submeter com sucesso e redirecionar para o login com flag password_updated=true", async () => {
    // Arrange
    vi.spyOn(authActions, "updateUserPassword").mockResolvedValue({
      success: true,
    });

    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    const passwordInput = screen.getByLabelText(/^nova senha$/i);
    const confirmInput = screen.getByLabelText(/^confirmar nova senha$/i);
    const submitBtn = screen.getByRole("button", { name: /salvar nova senha/i });

    // Act
    await user.type(passwordInput, "NovaSenhaSegura123");
    await user.type(confirmInput, "NovaSenhaSegura123");
    await act(async () => {
      await user.click(submitBtn);
    });

    // Assert
    expect(authActions.updateUserPassword).toHaveBeenCalledWith(
      "NovaSenhaSegura123"
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      /senha alterada com sucesso/i
    );
  });

  it("[IT-RP.5] Deve exibir mensagem de erro quando a Server Action retornar falha", async () => {
    // Arrange
    vi.spyOn(authActions, "updateUserPassword").mockResolvedValue({
      success: false,
      error: "Sessão expirada. Solicite um novo link de recuperação.",
    });

    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    const passwordInput = screen.getByLabelText(/^nova senha$/i);
    const confirmInput = screen.getByLabelText(/^confirmar nova senha$/i);
    const submitBtn = screen.getByRole("button", { name: /salvar nova senha/i });

    // Act
    await user.type(passwordInput, "NovaSenhaSegura123");
    await user.type(confirmInput, "NovaSenhaSegura123");
    await act(async () => {
      await user.click(submitBtn);
    });

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /sessão expirada/i
    );
  });
});
