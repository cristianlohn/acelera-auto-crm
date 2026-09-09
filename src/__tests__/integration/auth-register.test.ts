/**
 * @file auth-register.test.ts
 * @description Suíte de Testes de Integração para a Server Action de Registro (registerNewDealership).
 *
 * Cenários Testados:
 * - [IT-REG.1]: Validação client-side / server-side de campos obrigatórios (nome da loja, gestor, email, whatsapp, senha).
 * - [IT-REG.2]: Provisionamento atômico delegando tenant e perfil à trigger handle_new_user com metadados estritos.
 * - [IT-REG.3]: Tratamento resiliente de erro quando o e-mail já está cadastrado no Supabase Auth.
 * - [IT-REG.4]: Tratamento correto quando o Supabase exige verificação de e-mail (sem sessão imediata).
 * - [IT-REG.5]: Fallback seguro para modo de demonstração quando o Supabase não estiver configurado.
 * - [TEST-TRIGGER-DELEGATION]: Garantia de que a action não realiza inserts manuais em organizations e profiles.
 * - [TEST-SIGNIN-FALLBACK]: Tentativa de login direto via signInWithPassword quando signUp não retorna sessão imediata.
 * - [TEST-NO-MOCK-LEAK]: Validação de segurança sobre presença de variáveis de ambiente no client admin.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerNewDealership } from "@/app/actions/auth";
import * as supabaseServerModule from "@/lib/supabase/server";
import * as supabaseAdminModule from "@/lib/supabase/admin";

describe("[IT-REG] Provisionamento de Tenant & Cadastro (registerNewDealership)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("[IT-REG.1] Deve rejeitar submissão com dados inválidos ou incompletos", async () => {
    // 1. Nome da loja vazio
    const resEmptyStore = await registerNewDealership({
      storeName: "",
      fullName: "Roberto Silva",
      email: "roberto@loja.com",
      phone: "11988887777",
      password: "password123",
    });
    expect(resEmptyStore.success).toBe(false);
    expect(resEmptyStore.error).toContain("Informe o nome da concessionária");

    // 2. Nome do gestor vazio
    const resEmptyName = await registerNewDealership({
      storeName: "Auto Prime",
      fullName: "",
      email: "roberto@loja.com",
      phone: "11988887777",
      password: "password123",
    });
    expect(resEmptyName.success).toBe(false);
    expect(resEmptyName.error).toContain("Informe o nome completo do gestor");

    // 3. E-mail inválido
    const resInvalidEmail = await registerNewDealership({
      storeName: "Auto Prime",
      fullName: "Roberto Silva",
      email: "email-invalido",
      phone: "11988887777",
      password: "password123",
    });
    expect(resInvalidEmail.success).toBe(false);
    expect(resInvalidEmail.error).toContain("e-mail corporativo válido");

    // 4. Telefone vazio
    const resEmptyPhone = await registerNewDealership({
      storeName: "Auto Prime",
      fullName: "Roberto Silva",
      email: "roberto@loja.com",
      phone: "",
      password: "password123",
    });
    expect(resEmptyPhone.success).toBe(false);
    expect(resEmptyPhone.error).toContain("telefone ou WhatsApp");

    // 5. Telefone com formato/DDD inválido
    const resInvalidPhone = await registerNewDealership({
      storeName: "Auto Prime",
      fullName: "Roberto Silva",
      email: "roberto@loja.com",
      phone: "01988887777",
      password: "password123",
    });
    expect(resInvalidPhone.success).toBe(false);
    expect(resInvalidPhone.error).toContain("número de telefone ou WhatsApp brasileiro válido");

    // 6. Senha curta (< 6 caracteres)
    const resShortPassword = await registerNewDealership({
      storeName: "Auto Prime",
      fullName: "Roberto Silva",
      email: "roberto@loja.com",
      phone: "11988887777",
      password: "123",
    });
    expect(resShortPassword.success).toBe(false);
    expect(resShortPassword.error).toContain("no mínimo 6 caracteres");
  });

  it("[IT-REG.2] Deve provisionar o usuário via Supabase Auth com metadados estritos delegando o tenant ao trigger", async () => {
    // Arrange: Mock do Supabase Server Client (Auth) com sessão ativa
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

    const mockSignUp = vi.fn().mockResolvedValue({
      data: {
        user: { id: "user_uuid_12345" },
        session: { access_token: "mock_jwt_token" },
      },
      error: null,
    });

    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue({
      auth: { signUp: mockSignUp },
    } as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>);

    // Act
    const result = await registerNewDealership({
      storeName: "Imperial Motors",
      fullName: "Carlos Eduardo",
      email: "carlos@imperialmotors.com.br",
      phone: "11977776666",
      password: "SenhaSegura123",
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.redirectUrl).toBe("/leads");
    expect(result.requiresEmailVerification).toBe(false);

    expect(mockSignUp).toHaveBeenCalledWith({
      email: "carlos@imperialmotors.com.br",
      password: "SenhaSegura123",
      options: {
        data: {
          full_name: "Carlos Eduardo",
          store_name: "Imperial Motors",
          phone: "(11) 97777-6666",
        },
      },
    });

    // Garante que não foram injetadas propriedades antigas ou redundantes
    const signUpOptions = mockSignUp.mock.calls[0][0].options.data;
    expect(signUpOptions).toHaveProperty("full_name", "Carlos Eduardo");
    expect(signUpOptions).toHaveProperty("store_name", "Imperial Motors");
    expect(signUpOptions).toHaveProperty("phone", "(11) 97777-6666");
    expect(signUpOptions).not.toHaveProperty("dealership_name");
  });

  it("[IT-REG.3] Deve retornar mensagem amigável quando o e-mail já estiver cadastrado no Supabase Auth", async () => {
    // Arrange
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue({
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "User already registered" },
        }),
      },
    } as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>);

    // Act
    const result = await registerNewDealership({
      storeName: "Loja Repetida",
      fullName: "Gestor",
      email: "duplicado@loja.com",
      phone: "11988889999",
      password: "SenhaValida123",
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Este e-mail já está cadastrado no sistema. Faça login para continuar."
    );
  });

  it("[IT-REG.4] Deve tratar quando o Supabase requer verificação de e-mail (sem sessão imediata)", async () => {
    // Arrange
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue({
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: {
            user: { id: "user_verify_email", identities: [{ id: "identity_1" }] },
            session: null,
          },
          error: null,
        }),
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { session: null },
          error: { message: "Email not confirmed" },
        }),
      },
    } as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>);

    // Act
    const result = await registerNewDealership({
      storeName: "Loja Verificacao",
      fullName: "Gestor Pendente",
      email: "pendente@loja.com",
      phone: "11988880000",
      password: "SenhaForte123",
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.requiresEmailVerification).toBe(true);
    expect(result.redirectUrl).toBe("/login?verified_pending=true");
    expect(result.message).toContain("Enviamos um link de confirmação para o seu e-mail");
  });

  it("[IT-REG.5] Deve provisionar em modo demo quando o Supabase não estiver configurado", async () => {
    // Arrange
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(false);

    // Act
    const result = await registerNewDealership({
      storeName: "Loja Sem Supabase",
      fullName: "Gestor Demo",
      email: "demo@loja.com",
      phone: "11988881234",
      password: "SenhaDemo123",
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.redirectUrl).toBe("/leads");
    expect(result.requiresEmailVerification).toBe(false);
  });

  it("[TEST-TRIGGER-DELEGATION] Deve garantir que registerNewDealership NÃO executa inserts manuais em organizations ou profiles", async () => {
    // Arrange
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

    const mockSignUp = vi.fn().mockResolvedValue({
      data: {
        user: { id: "user_trigger_delegation" },
        session: { access_token: "mock_jwt" },
      },
      error: null,
    });

    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue({
      auth: { signUp: mockSignUp },
    } as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>);

    const mockInsertOrg = vi.fn();
    const mockUpsertProfile = vi.fn();

    const mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "organizations") return { insert: mockInsertOrg };
        if (table === "profiles") return { upsert: mockUpsertProfile };
        return {};
      }),
    };

    const spyCreateAdmin = vi
      .spyOn(supabaseAdminModule, "createAdminClient")
      .mockReturnValue(mockAdminClient as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>);

    // Act
    const result = await registerNewDealership({
      storeName: "Autonomia Trigger Motors",
      fullName: "Diretor Autônomo",
      email: "diretor@autonomia.com.br",
      phone: "(11) 99999-8888",
      password: "SenhaSegura123",
    });

    // Assert: Valida que a action delegou tudo ao trigger e NÃO efetuou mutações diretas
    expect(result.success).toBe(true);
    expect(mockInsertOrg).not.toHaveBeenCalled();
    expect(mockUpsertProfile).not.toHaveBeenCalled();
  });

  it("[TEST-SIGNIN-FALLBACK] Deve autenticar com signInWithPassword quando signUp inicial não retornar sessão ativa", async () => {
    // Arrange
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

    const mockSignInWithPassword = vi.fn().mockResolvedValue({
      data: { session: { access_token: "direct_token" } },
      error: null,
    });

    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue({
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: {
            user: { id: "user_with_fallback_signin" },
            session: null, // Sem sessão inicial no signUp
          },
          error: null,
        }),
        signInWithPassword: mockSignInWithPassword,
      },
    } as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>);

    // Act
    const result = await registerNewDealership({
      storeName: "Auto Sucesso Direto",
      fullName: "Gestor Direto",
      email: "direto@loja.com.br",
      phone: "(11) 98888-1111",
      password: "SenhaSegura123",
    });

    // Assert: Deve tentar login com senha e obter sucesso direto redirecionando para /leads
    expect(result.success).toBe(true);
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "direto@loja.com.br",
      password: "SenhaSegura123",
    });
    expect(result.requiresEmailVerification).toBe(false);
    expect(result.redirectUrl).toBe("/leads");
  });

  it("[TEST-NO-MOCK-LEAK] Deve validar erro crítico em createAdminClient se variáveis de ambiente estiverem ausentes", () => {
    // Arrange: Salva e remove temporariamente as variáveis de ambiente
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      // Act & Assert: Deve lançar erro crítico com mensagem explícita
      expect(() => supabaseAdminModule.createAdminClient()).toThrow(
        /\[CRITICAL\] NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas no ambiente/i
      );
    } finally {
      // Restaura variáveis
      if (originalUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      if (originalKey) process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    }
  });
});
