/**
 * @file register-page.test.tsx
 * @description Suíte de Testes de Integração da Página de Cadastro de Concessionária (RegisterPage).
 *
 * ============================================================================
 * ESCOPO DE TESTE & RASTREABILIDADE (SUT: RegisterPage / REQ-CRM-13)
 * ============================================================================
 * Funcionalidades e Fluxos Testados:
 *   - [IT-13.1]: Renderização de todos os campos (loja, gestor, email, whatsapp, senha) e destaque do trial de 14 dias.
 *   - [IT-13.2]: Validação client-side de campos obrigatórios ao tentar submeter vazio.
 *   - [IT-13.3]: Validação de formato de e-mail corporativo e tamanho mínimo de senha (>= 6 caracteres).
 *   - [IT-13.4]: Submissão com dados válidos invocando a Server Action e redirecionando para /leads.
 *   - [IT-13.5]: Tratamento e exibição de feedback visual quando a Server Action retorna erro (ex: e-mail já existente).
 *   - [IT-13.6]: Links de navegação para a tela de login (/login) e página inicial (/).
 *
 * Padrão Estrutural: AAA (Arrange, Act, Assert)
 * Ambiente de Execução: Happy-DOM / Vitest / Testing Library
 * ============================================================================
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterPage from "@/app/(auth)/register/page";
import * as authActions from "@/app/actions/auth";

// Mock do useRouter do Next.js
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe("[IT-13] Cadastro de Concessionária e Provisionamento de Tenant (RegisterPage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[IT-13.1] Deve renderizar todos os campos obrigatórios do formulário e o destaque do trial de 14 dias", () => {
    // Arrange & Act (Dado que a tela de cadastro é renderizada)
    render(<RegisterPage />);

    // Assert (Então todos os campos e termos do trial devem ser exibidos)
    expect(
      screen.getByLabelText(/nome da concessionária \/ loja/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/nome completo do gestor/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/e-mail corporativo/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/whatsapp \/ celular/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/senha de acesso/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/confirmar senha/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /criar conta e começar/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/14 dias de teste grátis/i)
    ).toBeInTheDocument();
  });

  it("[IT-13.2] Deve exibir alerta de validação ao tentar submeter o formulário em branco", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<RegisterPage />);

    const submitBtn = screen.getByRole("button", {
      name: /criar conta e começar/i,
    });

    // Act (Submete sem preencher campos)
    await user.click(submitBtn);

    // Assert (Alerta de preenchimento é exibido e redirecionamento não ocorre)
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/informe o nome da sua concessionária/i);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("[IT-13.3] Deve validar o formato de e-mail, comprimento mínimo de senha e confirmação de senha", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<RegisterPage />);

    const storeInput = screen.getByLabelText(/nome da concessionária/i);
    const nameInput = screen.getByLabelText(/nome completo do gestor/i);
    const emailInput = screen.getByLabelText(/e-mail corporativo/i);
    const phoneInput = screen.getByLabelText(/whatsapp/i);
    const passwordInput = screen.getByLabelText(/senha de acesso/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmar senha/i);
    const submitBtn = screen.getByRole("button", {
      name: /criar conta e começar/i,
    });

    // Act 1: E-mail inválido
    await user.type(storeInput, "Auto Prime");
    await user.type(nameInput, "Carlos Eduardo");
    await user.type(emailInput, "email-invalido-sem-arroba");
    await user.type(phoneInput, "11999998888");
    await user.type(passwordInput, "123456");
    await user.type(confirmPasswordInput, "123456");
    await user.click(submitBtn);

    // Assert 1
    let alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/e-mail corporativo válido/i);

    // Act 2: Senha curta (< 6 caracteres)
    await user.clear(emailInput);
    await user.type(emailInput, "carlos@autoprime.com.br");
    await user.clear(passwordInput);
    await user.type(passwordInput, "123");
    await user.clear(confirmPasswordInput);
    await user.type(confirmPasswordInput, "123");
    await user.click(submitBtn);

    // Assert 2
    alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/no mínimo 6 caracteres/i);

    // Act 3: Senhas divergentes
    await user.clear(passwordInput);
    await user.type(passwordInput, "SenhaSegura123");
    await user.clear(confirmPasswordInput);
    await user.type(confirmPasswordInput, "SenhaDiferente456");
    await user.click(submitBtn);

    // Assert 3
    alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/as senhas não coincidem/i);
  });

  it("[IT-13.4] Deve submeter dados válidos, chamar registerNewDealership e redirecionar para /leads", async () => {
    // Arrange
    const spyRegister = vi
      .spyOn(authActions, "registerNewDealership")
      .mockResolvedValueOnce({ success: true });

    const user = userEvent.setup();
    render(<RegisterPage />);

    // Act (Preenche todos os campos válidos)
    await user.type(
      screen.getByLabelText(/nome da concessionária/i),
      "Auto Imperial Veículos"
    );
    await user.type(
      screen.getByLabelText(/nome completo do gestor/i),
      "Roberto Silva"
    );
    await user.type(
      screen.getByLabelText(/e-mail corporativo/i),
      "roberto@autoimperial.com.br"
    );
    await user.type(
      screen.getByLabelText(/whatsapp/i),
      "(11) 98888-7777"
    );
    await user.type(
      screen.getByLabelText(/senha de acesso/i),
      "SenhaForte123"
    );
    await user.type(
      screen.getByLabelText(/confirmar senha/i),
      "SenhaForte123"
    );

    const submitBtn = screen.getByRole("button", {
      name: /criar conta e começar/i,
    });

    await act(async () => {
      await user.click(submitBtn);
    });

    // Assert (Ação do servidor é chamada com os dados e redireciona para /leads)
    expect(spyRegister).toHaveBeenCalledWith({
      storeName: "Auto Imperial Veículos",
      fullName: "Roberto Silva",
      email: "roberto@autoimperial.com.br",
      phone: "(11) 98888-7777",
      password: "SenhaForte123",
    });
    expect(mockPush).toHaveBeenCalledWith("/leads");
  });

  it("[IT-13.5] Deve exibir mensagem de erro quando a Server Action retornar falha (e-mail duplicado)", async () => {
    // Arrange (Simula falha de e-mail já existente)
    vi.spyOn(authActions, "registerNewDealership").mockResolvedValueOnce({
      success: false,
      error: "Este e-mail já está cadastrado no sistema. Faça login para continuar.",
    });

    const user = userEvent.setup();
    render(<RegisterPage />);

    // Act
    await user.type(screen.getByLabelText(/nome da concessionária/i), "Loja Teste");
    await user.type(screen.getByLabelText(/nome completo do gestor/i), "Gestor Teste");
    await user.type(screen.getByLabelText(/e-mail corporativo/i), "existente@loja.com");
    await user.type(screen.getByLabelText(/whatsapp/i), "11999991111");
    await user.type(screen.getByLabelText(/senha de acesso/i), "Senha123");
    await user.type(screen.getByLabelText(/confirmar senha/i), "Senha123");

    const submitBtn = screen.getByRole("button", {
      name: /criar conta e começar/i,
    });

    await act(async () => {
      await user.click(submitBtn);
    });

    // Assert (Mensagem de erro da Server Action é exibida no alert)
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/este e-mail já está cadastrado no sistema/i);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("[IT-13.6] Deve conter links de navegação para a tela de login e página inicial", () => {
    // Arrange & Act
    render(<RegisterPage />);

    // Assert (Verifica links de navegação)
    const loginLinks = screen.getAllByRole("link", {
      name: /já tem conta\? entrar|entrar no crm/i,
    });
    expect(loginLinks.length).toBeGreaterThanOrEqual(1);
    expect(loginLinks[0]).toHaveAttribute("href", "/login");

    const homeLinks = screen.getAllByRole("link", {
      name: /página inicial|voltar para a página inicial/i,
    });
    expect(homeLinks.length).toBeGreaterThanOrEqual(1);
    expect(homeLinks[0]).toHaveAttribute("href", "/");
  });
});
