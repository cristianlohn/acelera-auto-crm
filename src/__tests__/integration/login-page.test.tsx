/**
 * @file login-page.test.tsx
 * @description Suíte de Testes de Integração da Página de Login (LoginPage).
 *
 * ============================================================================
 * ESCOPO DE TESTE & RASTREABILIDADE (SUT: LoginPage)
 * ============================================================================
 * Funcionalidades e Fluxos Testados:
 *   - [IT-12.1]: Renderização dos campos de e-mail, senha e botões de ação (Demo e Tradicional).
 *   - [IT-12.2]: Validação de campos obrigatórios e exibição de alerta ao tentar submeter vazio.
 *   - [IT-12.3]: Submissão com credenciais válidas disparando redirecionamento para o dashboard.
 *   - [IT-12.4]: Acionamento do botão "Entrar como Concessionária Demo" definindo cookie e redirecionando para /leads.
 *   - [IT-12.5]: Validação dos links de retorno para a página inicial (Landing Page).
 *
 * Padrão Estrutural: AAA (Arrange, Act, Assert)
 * Ambiente de Execução: Happy-DOM / Vitest / Testing Library
 * ============================================================================
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/app/(auth)/login/page";

// Mock do useRouter e useSearchParams do Next.js
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

describe("[IT-12] Página de Login e Autenticação (LoginPage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    document.cookie = "";
  });

  it("[IT-12.1] Deve renderizar os campos de e-mail, senha e botões de login", () => {
    // Arrange & Act (Dado que a tela de login é renderizada)
    render(<LoginPage />);

    // Assert (Então os campos e botões devem estar presentes)
    expect(screen.getByLabelText(/^e-mail$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /entrar como concessionária demo/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /entrar no crm/i })
    ).toBeInTheDocument();
  });

  it("[IT-12.2] Deve exibir alerta de validação ao submeter formulário sem credenciais", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<LoginPage />);

    const submitBtn = screen.getByRole("button", { name: /entrar no crm/i });

    // Act (Submete formulário vazio)
    await user.click(submitBtn);

    // Assert (Alerta é exibido e router.push não é chamado)
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/preencha seu e-mail e senha/i);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("[IT-12.3] Deve autenticar por credenciais válidas e redirecionar para /leads", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/^e-mail$/i);
    const passwordInput = screen.getByLabelText(/^senha$/i);
    const submitBtn = screen.getByRole("button", { name: /entrar no crm/i });

    // Act (Preenche credenciais e clica em Entrar)
    await user.type(emailInput, "gerente@aceleraauto.com.br");
    await user.type(passwordInput, "SenhaSegura123");

    await act(async () => {
      await user.click(submitBtn);
    });

    // Assert (Redirecionamento para /leads é chamado e cookies de demo são removidos)
    expect(window.location.href).toContain("/leads");
    expect(document.cookie).not.toContain("acelera_demo_mode=true");
  });

  it("[IT-12.4] Deve permitir acesso instantâneo ao clicar em 'Entrar como Concessionária Demo'", () => {
    // Arrange
    render(<LoginPage />);

    const demoBtn = screen.getByRole("button", {
      name: /entrar como concessionária demo/i,
    });

    // Act (Clica no botão de acesso rápido demo)
    act(() => {
      fireEvent.click(demoBtn);
    });

    // Assert (Cookie de demo definido e redirecionado para /leads)
    expect(document.cookie).toContain("acelera_demo_mode=true");
    expect(window.location.href).toContain("/leads");
  });

  it("[IT-12.5] Deve conter links de navegação para retornar à página inicial", () => {
    // Arrange & Act
    render(<LoginPage />);

    // Assert (Verifica links de retorno)
    const homeLinks = screen.getAllByRole("link", {
      name: /página inicial|voltar para a página inicial/i,
    });

    expect(homeLinks.length).toBeGreaterThanOrEqual(1);
    expect(homeLinks[0]).toHaveAttribute("href", "/");
  });

  it("[IT-12.6] Deve exibir banner de confirmação de e-mail quando verified=true na URL", () => {
    // Arrange
    mockSearchParams = new URLSearchParams("verified=true");

    // Act
    render(<LoginPage />);

    // Assert
    expect(
      screen.getByText(/e-mail confirmado com sucesso/i)
    ).toBeInTheDocument();
  });

  it("[IT-12.7] Deve exibir banner de erro de autenticação quando error=auth_callback_error na URL", () => {
    // Arrange
    mockSearchParams = new URLSearchParams("error=auth_callback_error");

    // Act
    render(<LoginPage />);

    // Assert
    expect(
      screen.getByText(/não foi possível validar o link de autenticação/i)
    ).toBeInTheDocument();
  });

  it("[IT-12.8] Deve exibir banner de confirmação quando password_updated=true na URL", () => {
    // Arrange
    mockSearchParams = new URLSearchParams("password_updated=true");

    // Act
    render(<LoginPage />);

    // Assert
    expect(
      screen.getByText(/senha redefinida com sucesso/i)
    ).toBeInTheDocument();
  });

  it("[IT-12.9] Deve abrir modal de recuperação de senha e enviar solicitação", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<LoginPage />);

    const forgotBtn = screen.getByRole("button", { name: /esqueceu a senha\?/i });

    // Act: Abre o modal
    await user.click(forgotBtn);

    // Assert modal aberto
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/recuperar acesso/i)).toBeInTheDocument();

    // Act: Preenche e-mail e envia
    const emailInput = screen.getByLabelText(/e-mail corporativo/i);
    const sendBtn = screen.getByRole("button", { name: /enviar link de recuperação/i });

    await user.type(emailInput, "gestor@concessionaria.com.br");
    await act(async () => {
      await user.click(sendBtn);
    });

    // Assert feedback exibido
    expect(
      screen.getByText(/enviamos um link de recuperação/i)
    ).toBeInTheDocument();
  });
});
