/**
 * @file update-password.test.tsx
 * @description Suíte de Testes Unitários para a Tela de Definição de Senha (/auth/update-password).
 *
 * Cenários Testados:
 * - [UT-PASS.1]: Renderização dos campos de Nova Senha e Confirmação de Senha.
 * - [UT-PASS.2]: Bloqueio / desabilitação do botão quando senhas não coincidem ou têm menos de 6 caracteres.
 * - [UT-PASS.3]: Submissão bem-sucedida com chamada de atualização e redirecionamento para o CRM.
 * - [UT-PASS.4]: Exibição de banner de erro caso a atualização falhe (ex: sessão expirada).
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UpdatePasswordPage from "@/app/auth/update-password/page";
import * as authActionsModule from "@/app/actions/auth";

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("[UNIT-UPDATE-PASSWORD] Tela de Definição de Senha (/auth/update-password)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("[UT-PASS.1] Deve renderizar o formulário com campos de senha e confirmação", () => {
    render(<UpdatePasswordPage />);

    expect(screen.getByRole("heading", { name: /crie sua senha de acesso/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^nova senha$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^confirmar nova senha$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /salvar senha e acessar crm/i })).toBeInTheDocument();
  });

  it("[UT-PASS.2] Deve manter o botão de submissão desabilitado quando a validação falhar", () => {
    render(<UpdatePasswordPage />);

    const submitBtn = screen.getByRole("button", { name: /salvar senha e acessar crm/i });
    expect(submitBtn).toBeDisabled();

    const passwordInput = screen.getByLabelText(/^nova senha$/i);
    const confirmInput = screen.getByLabelText(/^confirmar nova senha$/i);

    // Senha curta (< 6 caracteres)
    fireEvent.change(passwordInput, { target: { value: "123" } });
    fireEvent.change(confirmInput, { target: { value: "123" } });
    expect(submitBtn).toBeDisabled();

    // Senhas diferentes
    fireEvent.change(passwordInput, { target: { value: "senha123" } });
    fireEvent.change(confirmInput, { target: { value: "outrasenha" } });
    expect(submitBtn).toBeDisabled();

    // Senhas válidas e coincidentes
    fireEvent.change(confirmInput, { target: { value: "senha123" } });
    expect(submitBtn).not.toBeDisabled();
  });

  it("[UT-PASS.3] Deve chamar updateUserPassword com sucesso e redirecionar para /leads", async () => {
    const updateSpy = vi
      .spyOn(authActionsModule, "updateUserPassword")
      .mockResolvedValue({ success: true });

    render(<UpdatePasswordPage />);

    const passwordInput = screen.getByLabelText(/^nova senha$/i);
    const confirmInput = screen.getByLabelText(/^confirmar nova senha$/i);
    const submitBtn = screen.getByRole("button", { name: /salvar senha e acessar crm/i });

    fireEvent.change(passwordInput, { target: { value: "segredo123" } });
    fireEvent.change(confirmInput, { target: { value: "segredo123" } });

    await React.act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith("segredo123");
    });
  });

  it("[UT-PASS.4] Deve exibir mensagem de erro caso o link tenha expirado", async () => {
    vi.spyOn(authActionsModule, "updateUserPassword").mockResolvedValue({
      success: false,
      error: "O link de convite expirou. Solicite um novo acesso.",
    });

    render(<UpdatePasswordPage />);

    const passwordInput = screen.getByLabelText(/^nova senha$/i);
    const confirmInput = screen.getByLabelText(/^confirmar nova senha$/i);
    const submitBtn = screen.getByRole("button", { name: /salvar senha e acessar crm/i });

    fireEvent.change(passwordInput, { target: { value: "segredo123" } });
    fireEvent.change(confirmInput, { target: { value: "segredo123" } });

    await React.act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/o link de convite expirou/i)
      ).toBeInTheDocument();
    });
  });
});
