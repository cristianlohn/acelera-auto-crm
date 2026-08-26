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
import { render, screen, act, fireEvent } from "@testing-library/react";
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
      screen.getByLabelText(/declaro que li e concordo com os/i)
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
    render(<RegisterPage />);

    const storeInput = screen.getByLabelText(/nome da concessionária/i);
    const nameInput = screen.getByLabelText(/nome completo do gestor/i);
    const emailInput = screen.getByLabelText(/e-mail corporativo/i);
    const phoneInput = screen.getByLabelText(/whatsapp/i);
    const passwordInput = screen.getByLabelText(/senha de acesso/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmar senha/i);
    const termsCheckbox = screen.getByLabelText(/declaro que li e concordo com os/i);
    const submitBtn = screen.getByRole("button", {
      name: /criar conta e começar/i,
    });

    // Act 1: E-mail inválido
    fireEvent.change(storeInput, { target: { value: "Auto Prime" } });
    fireEvent.change(nameInput, { target: { value: "Carlos Eduardo" } });
    fireEvent.change(emailInput, { target: { value: "email-invalido-sem-arroba" } });
    fireEvent.change(phoneInput, { target: { value: "11999998888" } });
    fireEvent.change(passwordInput, { target: { value: "123456" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "123456" } });
    fireEvent.click(termsCheckbox);
    fireEvent.click(submitBtn);

    // Assert 1
    let alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/e-mail corporativo válido/i);

    // Act 2: Senha curta (< 6 caracteres)
    fireEvent.change(emailInput, { target: { value: "carlos@autoprime.com.br" } });
    fireEvent.change(passwordInput, { target: { value: "123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "123" } });
    fireEvent.click(submitBtn);

    // Assert 2
    alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/no mínimo 6 caracteres/i);

    // Act 3: Senhas divergentes
    fireEvent.change(passwordInput, { target: { value: "SenhaSegura123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "SenhaDiferente456" } });
    fireEvent.click(submitBtn);

    // Assert 3
    alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/as senhas não coincidem/i);

    // Act 4: Senhas coincidem mas desmarca termos
    fireEvent.change(confirmPasswordInput, { target: { value: "SenhaSegura123" } });
    fireEvent.click(termsCheckbox); // Desmarca
    fireEvent.click(submitBtn);

    // Assert 4
    alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/você deve concordar com os termos de uso/i);
  });

  it("[IT-13.4] Deve submeter dados válidos, chamar registerNewDealership e redirecionar para /leads", async () => {
    // Arrange
    const spyRegister = vi
      .spyOn(authActions, "registerNewDealership")
      .mockResolvedValueOnce({ success: true });

    render(<RegisterPage />);

    // Act (Preenche todos os campos válidos)
    fireEvent.change(screen.getByLabelText(/nome da concessionária/i), {
      target: { value: "Auto Imperial Veículos" },
    });
    fireEvent.change(screen.getByLabelText(/nome completo do gestor/i), {
      target: { value: "Roberto Silva" },
    });
    fireEvent.change(screen.getByLabelText(/e-mail corporativo/i), {
      target: { value: "roberto@autoimperial.com.br" },
    });
    fireEvent.change(screen.getByLabelText(/whatsapp/i), {
      target: { value: "(11) 98888-7777" },
    });
    fireEvent.change(screen.getByLabelText(/senha de acesso/i), {
      target: { value: "SenhaForte123" },
    });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: "SenhaForte123" },
    });
    fireEvent.click(screen.getByLabelText(/declaro que li e concordo com os/i));

    const submitBtn = screen.getByRole("button", {
      name: /criar conta e começar/i,
    });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Assert (Ação do servidor é chamada com os dados e redireciona para /leads)
    expect(spyRegister).toHaveBeenCalledWith({
      storeName: "Auto Imperial Veículos",
      fullName: "Roberto Silva",
      email: "roberto@autoimperial.com.br",
      phone: "(11) 98888-7777",
      password: "SenhaForte123",
    });
    expect(window.location.href).toContain("/leads");
  });

  it("[IT-13.5] Deve exibir mensagem de erro quando a Server Action retornar falha (e-mail duplicado)", async () => {
    // Arrange (Simula falha de e-mail já existente)
    vi.spyOn(authActions, "registerNewDealership").mockResolvedValueOnce({
      success: false,
      error: "Este e-mail já está cadastrado no sistema. Faça login para continuar.",
    });

    render(<RegisterPage />);

    // Act
    fireEvent.change(screen.getByLabelText(/nome da concessionária/i), {
      target: { value: "Loja Teste" },
    });
    fireEvent.change(screen.getByLabelText(/nome completo do gestor/i), {
      target: { value: "Gestor Teste" },
    });
    fireEvent.change(screen.getByLabelText(/e-mail corporativo/i), {
      target: { value: "existente@loja.com" },
    });
    fireEvent.change(screen.getByLabelText(/whatsapp/i), {
      target: { value: "11999991111" },
    });
    fireEvent.change(screen.getByLabelText(/senha de acesso/i), {
      target: { value: "Senha123" },
    });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: "Senha123" },
    });
    fireEvent.click(screen.getByLabelText(/declaro que li e concordo com os/i));

    const submitBtn = screen.getByRole("button", {
      name: /criar conta e começar/i,
    });

    await act(async () => {
      fireEvent.click(submitBtn);
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

  it("[IT-13.7] Deve alternar a visibilidade da Senha e Confirmar Senha entre 'password' e 'text' ao clicar nos botões de olho", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<RegisterPage />);

    const passwordInput = screen.getByLabelText(/senha de acesso/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmar senha/i);
    const togglePasswordBtn = screen.getByRole("button", { name: /exibir senha/i });
    const toggleConfirmPasswordBtn = screen.getByRole("button", { name: /exibir confirmação de senha/i });

    // Assert inicial: Ambos devem iniciar com type="password"
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(confirmPasswordInput).toHaveAttribute("type", "password");

    // Act 1: Clica para exibir a Senha
    await user.click(togglePasswordBtn);

    // Assert 1: Senha vira type="text", botão atualiza aria-label para "Ocultar senha"
    expect(passwordInput).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: /ocultar senha/i })).toBeInTheDocument();
    expect(confirmPasswordInput).toHaveAttribute("type", "password");

    // Act 2: Clica para ocultar a Senha novamente
    await user.click(screen.getByRole("button", { name: /ocultar senha/i }));

    // Assert 2: Senha volta a ser type="password"
    expect(passwordInput).toHaveAttribute("type", "password");

    // Act 3: Clica para exibir a Confirmação de Senha
    await user.click(toggleConfirmPasswordBtn);

    // Assert 3: Confirmação vira type="text", botão atualiza aria-label para "Ocultar confirmação de senha"
    expect(confirmPasswordInput).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: /ocultar confirmação de senha/i })).toBeInTheDocument();

    // Act 4: Clica para ocultar a Confirmação de Senha novamente
    await user.click(screen.getByRole("button", { name: /ocultar confirmação de senha/i }));

    // Assert 4: Confirmação volta para type="password"
    expect(confirmPasswordInput).toHaveAttribute("type", "password");
  });

  it("[IT-13.8] Deve exibir o card de confirmação de e-mail quando a criação exigir ativação por link", async () => {
    // Arrange
    vi.spyOn(authActions, "registerNewDealership").mockResolvedValue({
      success: true,
      requiresEmailVerification: true,
      message: "Enviamos um link de confirmação para o seu e-mail.",
      redirectUrl: "/login?verified_pending=true",
    });

    render(<RegisterPage />);

    // Preenchimento de campos válidos
    fireEvent.change(screen.getByLabelText(/nome da concessionária/i), {
      target: { value: "Top Car Veículos" },
    });
    fireEvent.change(screen.getByLabelText(/nome completo do gestor/i), {
      target: { value: "Marcos Souza" },
    });
    fireEvent.change(screen.getByLabelText(/e-mail corporativo/i), {
      target: { value: "marcos@topcar.com.br" },
    });
    fireEvent.change(screen.getByLabelText(/whatsapp \/ celular/i), {
      target: { value: "11988887777" },
    });
    fireEvent.change(screen.getByLabelText(/^senha de acesso \*/i), {
      target: { value: "SenhaSegura123" },
    });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: "SenhaSegura123" },
    });
    fireEvent.click(screen.getByLabelText(/declaro que li e concordo com os/i));

    // Act
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /criar conta e começar/i }));
    });

    // Assert: Card de confirmação é exibido com o e-mail informado e link para login
    expect(screen.getByTestId("verification-sent-card")).toBeInTheDocument();
    expect(screen.getByText(/quase lá! confirme seu e-mail/i)).toBeInTheDocument();
    expect(screen.getByText(/marcos@topcar.com.br/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ir para o login/i })).toHaveAttribute(
      "href",
      "/login"
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("[IT-13.9] Deve aplicar máscara dinâmica de telefone/WhatsApp progressivamente conforme digitação", () => {
    // Arrange
    render(<RegisterPage />);
    const phoneInput = screen.getByLabelText(/whatsapp \/ celular/i) as HTMLInputElement;

    // Act 1: Digita DDD e início do número
    fireEvent.change(phoneInput, { target: { value: "11988" } });
    expect(phoneInput.value).toBe("(11) 988");

    // Act 2: Digita celular completo com 11 dígitos
    fireEvent.change(phoneInput, { target: { value: "11988887777" } });
    expect(phoneInput.value).toBe("(11) 98888-7777");

    // Act 3: Digita telefone fixo com 10 dígitos
    fireEvent.change(phoneInput, { target: { value: "1133334444" } });
    expect(phoneInput.value).toBe("(11) 3333-4444");
  });

  it("[IT-13.10] Deve exibir alerta de validação se o número de WhatsApp informado for inválido", async () => {
    // Arrange
    render(<RegisterPage />);
    const storeInput = screen.getByLabelText(/nome da concessionária/i);
    const nameInput = screen.getByLabelText(/nome completo do gestor/i);
    const emailInput = screen.getByLabelText(/e-mail corporativo/i);
    const phoneInput = screen.getByLabelText(/whatsapp \/ celular/i);
    const passwordInput = screen.getByLabelText(/^senha de acesso \*/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmar senha/i);
    const termsCheckbox = screen.getByLabelText(/declaro que li e concordo com os/i);
    const submitBtn = screen.getByRole("button", { name: /criar conta e começar/i });

    // Preenche com telefone com DDD inválido (01)
    fireEvent.change(storeInput, { target: { value: "Auto Prime" } });
    fireEvent.change(nameInput, { target: { value: "Carlos Eduardo" } });
    fireEvent.change(emailInput, { target: { value: "carlos@autoprime.com.br" } });
    fireEvent.change(phoneInput, { target: { value: "01988887777" } });
    fireEvent.change(passwordInput, { target: { value: "SenhaSegura123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "SenhaSegura123" } });
    fireEvent.click(termsCheckbox);

    // Act
    fireEvent.click(submitBtn);

    // Assert
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/número de whatsapp ou celular brasileiro válido/i);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
