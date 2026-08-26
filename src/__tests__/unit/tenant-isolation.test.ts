/**
 * @file tenant-isolation.test.ts
 * @description Suíte de Testes Unitários e de Integração para Isolamento Estrito de Tenant e Modo Demonstração.
 *
 * Cenários Testados:
 * - [IT-TENANT.1]: Usuário no Modo Demo explícito acessa organização Sandbox (DEFAULT_DEMO_ORG_ID).
 * - [IT-TENANT.2]: Usuário Real autenticado resolve estritamente sua própria organização.
 * - [IT-TENANT.3]: Usuário Real autenticado SEM organização NÃO herda dados de demonstração (zero fallback).
 * - [IT-TENANT.4]: Ações de Logout e Limpeza de Cookies eliminam resquícios de demo.
 * - [IT-TENANT.5]: Usuário anônimo sem cookies de demo retorna contexto nulo e seguro.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resolveUserTenantContext,
  DEFAULT_DEMO_ORG_ID,
} from "@/lib/auth/tenant";
import { clearDemoCookiesAction, logoutAction } from "@/app/actions/auth";
import * as supabaseServerModule from "@/lib/supabase/server";
import { cookies } from "next/headers";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

describe("[IT-TENANT] Isolamento Estrito de Tenant (Demo vs Usuários Reais)", () => {
  const mockCookieStore = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockCookieStore.get.mockReturnValue(undefined);
    (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockCookieStore
    );
  });

  it("[IT-TENANT.1] Modo Demonstração Explícito: resolve tenant sandbox quando cookie acelera_demo_mode=true e sem usuário logado", async () => {
    // Arrange
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);
    mockCookieStore.get.mockImplementation((name: string) => {
      if (name === "acelera_demo_mode") return { value: "true" };
      return undefined;
    });

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    };

    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>
    );

    // Act
    const context = await resolveUserTenantContext();

    // Assert
    expect(context.isDemo).toBe(true);
    expect(context.organizationId).toBe(DEFAULT_DEMO_ORG_ID);
    expect(context.needsOnboarding).toBe(false);
  });

  it("[IT-TENANT.2] Usuário Real Autenticado: resolve estritamente sua própria organização a partir de profiles", async () => {
    // Arrange
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);
    mockCookieStore.get.mockReturnValue({ value: "true" }); // Mesmo se houver cookie residual de demo

    const mockUser = { id: "user_real_999", email: "gestor@concessionariareal.com.br" };
    const mockProfile = {
      id: "user_real_999",
      organization_id: "org_real_alpha_888",
      full_name: "Gestor Titular",
      role: "admin",
    };
    const mockOrg = {
      id: "org_real_alpha_888",
      name: "Concessionária Alpha Real",
      slug: "alpha-real",
      subscription_status: "active",
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
              }),
            }),
          };
        }
        if (table === "organizations") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockOrg, error: null }),
              }),
            }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>
    );

    // Act
    const context = await resolveUserTenantContext();

    // Assert
    expect(context.isDemo).toBe(false);
    expect(context.userId).toBe("user_real_999");
    expect(context.organizationId).toBe("org_real_alpha_888");
    expect(context.organization?.name).toBe("Concessionária Alpha Real");
    expect(context.needsOnboarding).toBe(false);
  });

  it("[IT-TENANT.3] Usuário Real Autenticado SEM Organização: retorna needsOnboarding=true e NUNCA faz fallback para demo", async () => {
    // Arrange
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

    const mockUser = { id: "user_sem_org_111", email: "novousuario@semorg.com" };
    const mockProfile = {
      id: "user_sem_org_111",
      organization_id: null, // Sem organização vinculada
      full_name: "Novo Usuário",
      role: "admin",
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          }),
        }),
      })),
    };

    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>
    );

    // Act
    const context = await resolveUserTenantContext();

    // Assert
    expect(context.isDemo).toBe(false);
    expect(context.userId).toBe("user_sem_org_111");
    expect(context.organizationId).toBeNull();
    expect(context.organizationId).not.toBe(DEFAULT_DEMO_ORG_ID);
    expect(context.needsOnboarding).toBe(true);
  });

  it("[IT-TENANT.4] Limpeza de Cookies: clearDemoCookiesAction e logoutAction removem cookies de demonstração", async () => {
    // Arrange
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);
    const mockSignOut = vi.fn().mockResolvedValue({ error: null });

    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue({
      auth: {
        signOut: mockSignOut,
      },
    } as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>);

    // Act: Limpeza direta
    const clearResult = await clearDemoCookiesAction();
    expect(clearResult.success).toBe(true);
    expect(mockCookieStore.delete).toHaveBeenCalledWith("acelera_demo_mode");
    expect(mockCookieStore.delete).toHaveBeenCalledWith("sb-demo-auth");
    expect(mockCookieStore.delete).toHaveBeenCalledWith("demo_mode");

    // Act: Logout completo
    const logoutResult = await logoutAction();
    expect(logoutResult.success).toBe(true);
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("[IT-TENANT.5] Usuário Anônimo: sem cookies e sem sessão retorna contexto limpo", async () => {
    // Arrange
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);
    mockCookieStore.get.mockReturnValue(undefined);

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    };

    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>
    );

    // Act
    const context = await resolveUserTenantContext();

    // Assert
    expect(context.isDemo).toBe(false);
    expect(context.userId).toBeNull();
    expect(context.organizationId).toBeNull();
    expect(context.needsOnboarding).toBe(false);
  });
});
