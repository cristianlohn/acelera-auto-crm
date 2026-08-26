/**
 * @file auth-register.test.ts
 * @description Suíte de Testes de Integração para a Server Action de Registro (registerNewDealership).
 *
 * Cenários Testados:
 * - [IT-REG.1]: Validação client-side / server-side de campos obrigatórios (nome da loja, gestor, email, whatsapp, senha).
 * - [IT-REG.2]: Provisionamento com sucesso no Supabase via Admin Client (service_role) contornando restrições de RLS.
 * - [IT-REG.3]: Tratamento resiliente de erro quando o e-mail já está cadastrado no Supabase Auth.
 * - [IT-REG.4]: Tratamento de falha na criação da organização ou perfil com rollback seguro.
 * - [IT-REG.5]: Fallback seguro para modo de demonstração quando o Supabase não estiver configurado.
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

  it("[IT-REG.2] Deve provisionar o tenant e o perfil do gestor via Admin Client sem violação de RLS", async () => {
    // Arrange: Mock do Supabase Server Client (Auth) e Admin Client (Database)
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

    const mockSignUp = vi.fn().mockResolvedValue({
      data: { user: { id: "user_uuid_12345" } },
      error: null,
    });

    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue({
      auth: { signUp: mockSignUp },
    } as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>);

    const mockInsertOrg = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "org_uuid_67890" },
          error: null,
        }),
      }),
    });

    const mockUpsertProfile = vi.fn().mockResolvedValue({
      error: null,
    });

    const mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "organizations") {
          return { insert: mockInsertOrg };
        }
        if (table === "profiles") {
          return { upsert: mockUpsertProfile };
        }
        return {};
      }),
    };

    const spyAdminClient = vi
      .spyOn(supabaseAdminModule, "createAdminClient")
      .mockReturnValue(mockAdminClient as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>);

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
    expect(spyAdminClient).toHaveBeenCalled();
    expect(mockSignUp).toHaveBeenCalledWith({
      email: "carlos@imperialmotors.com.br",
      password: "SenhaSegura123",
      options: {
        data: {
          full_name: "Carlos Eduardo",
          dealership_name: "Imperial Motors",
          store_name: "Imperial Motors",
          phone: "(11) 97777-6666",
        },
      },
    });

    expect(mockInsertOrg).toHaveBeenCalledTimes(1);
    const orgPayload = mockInsertOrg.mock.calls[0][0];
    expect(orgPayload.name).toBe("Imperial Motors");
    expect(orgPayload.slug).toContain("imperial-motors");

    expect(mockUpsertProfile).toHaveBeenCalledWith({
      id: "user_uuid_12345",
      organization_id: "org_uuid_67890",
      full_name: "Carlos Eduardo",
      email: "carlos@imperialmotors.com.br",
      role: "admin",
      phone: "(11) 97777-6666",
      avatar_url: null,
    });
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

  it("[IT-REG.4] Deve executar rollback na organização caso a criação do perfil falhe", async () => {
    // Arrange
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue({
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { user: { id: "user_failed_profile" } },
          error: null,
        }),
      },
    } as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>);

    const mockDeleteOrg = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "organizations") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "org_rollback_id" },
                  error: null,
                }),
              }),
            }),
            delete: mockDeleteOrg,
          };
        }
        if (table === "profiles") {
          return {
            upsert: vi.fn().mockResolvedValue({
              error: { message: "Database connection lost during profile creation" },
            }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
      mockAdminClient as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
    );

    // Act
    const result = await registerNewDealership({
      storeName: "Loja Rollback",
      fullName: "Gestor Teste",
      email: "gestor@rollback.com",
      phone: "11988880000",
      password: "SenhaForte123",
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain("Erro ao associar perfil administrativo");
    expect(mockDeleteOrg).toHaveBeenCalledTimes(1);
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
  });

  it("[TEST-RLS-BYPASS] Deve garantir que o fluxo de provisionamento utiliza estritamente o cliente administrativo com service_role", async () => {
    // Arrange
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

    const mockSignUp = vi.fn().mockResolvedValue({
      data: { user: { id: "user_rls_bypass_id" } },
      error: null,
    });

    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue({
      auth: { signUp: mockSignUp },
    } as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>);

    const mockInsertOrg = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "org_rls_bypass_id" },
          error: null,
        }),
      }),
    });

    const mockUpsertProfile = vi.fn().mockResolvedValue({
      error: null,
    });

    const mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "organizations") return { insert: mockInsertOrg };
        if (table === "profiles") return { upsert: mockUpsertProfile };
        return {};
      }),
      auth: {
        admin: {
          deleteUser: vi.fn().mockResolvedValue({}),
        },
      },
    };

    const spyCreateAdmin = vi
      .spyOn(supabaseAdminModule, "createAdminClient")
      .mockReturnValue(mockAdminClient as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>);

    // Act
    const result = await registerNewDealership({
      storeName: "Bypass RLS Motors",
      fullName: "Diretor Master",
      email: "diretor@bypassrls.com.br",
      phone: "(11) 99999-8888",
      password: "SenhaSegura123",
    });

    // Assert: Valida que a ação invocou createAdminClient para mutação das tabelas protegidas por RLS
    expect(result.success).toBe(true);
    expect(spyCreateAdmin).toHaveBeenCalled();
    expect(mockAdminClient.from).toHaveBeenCalledWith("organizations");
    expect(mockAdminClient.from).toHaveBeenCalledWith("profiles");
  });

  it("[TEST-ORG-CREATION] Deve garantir que cada novo cadastro gera um organization_id e slug únicos e isolados", async () => {
    // Arrange
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue({
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { user: { id: "user_isolated_org_id" } },
          error: null,
        }),
      },
    } as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>);

    let insertedOrgSlug = "";
    const mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "organizations") {
          return {
            insert: vi.fn((payload: { name: string; slug: string }) => {
              insertedOrgSlug = payload.slug;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: `org_unique_${Date.now()}` },
                    error: null,
                  }),
                }),
              };
            }),
          };
        }
        if (table === "profiles") {
          return { upsert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
      mockAdminClient as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
    );

    // Act
    const result = await registerNewDealership({
      storeName: "Loja Isolada Premium",
      fullName: "Gestor Isolado",
      email: "gestor@isolada.com.br",
      phone: "(11) 98888-1111",
      password: "SenhaSegura123",
    });

    // Assert
    expect(result.success).toBe(true);
    expect(insertedOrgSlug).toMatch(/^loja-isolada-premium-[a-z0-9]+$/);
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
