/**
 * @file auth-callback.test.ts
 * @description Suíte de Testes de Integração para a Rota de Callback PKCE do Supabase (GET /auth/callback).
 *
 * Cenários Testados:
 * - [IT-CB.1]: Troca de código de autorização por sessão (exchangeCodeForSession) e redirecionamento com `verified=true`.
 * - [IT-CB.2]: Suporte a redirecionamento customizado via parâmetro `next`.
 * - [IT-CB.3]: Redirecionamento para /login?error=missing_code quando o código estiver ausente.
 * - [IT-CB.4]: Redirecionamento para /login?error=auth_callback_error quando o Supabase retornar erro na URL.
 * - [IT-CB.5]: Redirecionamento para /login?error=auth_callback_error quando a troca de código falhar.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/auth/callback/route";
import * as supabaseServerModule from "@/lib/supabase/server";

describe("[IT-CB] Callback de Autenticação PKCE (GET /auth/callback)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function createCallbackRequest(url: string): NextRequest {
    return new NextRequest(url, {
      method: "GET",
    });
  }

  it("[IT-CB.1] Deve trocar o código por sessão e redirecionar para /leads?verified=true", async () => {
    // Arrange
    const mockExchange = vi.fn().mockResolvedValue({
      data: { session: { access_token: "mock_token" }, user: { id: "user_123" } },
      error: null,
    });

    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);
    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue({
      auth: { exchangeCodeForSession: mockExchange },
    } as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>);

    const req = createCallbackRequest("https://aceleraautocrm.com.br/auth/callback?code=valid_pkce_code_123");

    // Act
    const res = await GET(req);

    // Assert
    expect(res.status).toBe(307);
    expect(mockExchange).toHaveBeenCalledWith("valid_pkce_code_123");
    expect(res.headers.get("location")).toBe("https://aceleraautocrm.com.br/leads?verified=true");
  });

  it("[IT-CB.2] Deve respeitar o destino 'next' informado nos parâmetros da URL", async () => {
    // Arrange
    const mockExchange = vi.fn().mockResolvedValue({
      data: { session: { access_token: "mock_token" }, user: { id: "user_123" } },
      error: null,
    });

    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);
    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue({
      auth: { exchangeCodeForSession: mockExchange },
    } as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>);

    const req = createCallbackRequest(
      "https://aceleraautocrm.com.br/auth/callback?code=valid_pkce_code_123&next=/settings"
    );

    // Act
    const res = await GET(req);

    // Assert
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://aceleraautocrm.com.br/settings?verified=true");
  });

  it("[IT-CB.3] Deve redirecionar para /login?error=missing_code quando o código estiver ausente", async () => {
    // Arrange
    const req = createCallbackRequest("https://aceleraautocrm.com.br/auth/callback");

    // Act
    const res = await GET(req);

    // Assert
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://aceleraautocrm.com.br/login?error=missing_code");
  });

  it("[IT-CB.4] Deve redirecionar para /login?error=auth_callback_error quando houver parâmetro de erro", async () => {
    // Arrange
    const req = createCallbackRequest(
      "https://aceleraautocrm.com.br/auth/callback?error=access_denied&error_description=User%20cancelled"
    );

    // Act
    const res = await GET(req);

    // Assert
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "https://aceleraautocrm.com.br/login?error=auth_callback_error"
    );
  });

  it("[IT-CB.5] Deve redirecionar para /login?error=auth_callback_error quando a troca de código falhar", async () => {
    // Arrange
    const mockExchange = vi.fn().mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "Invalid or expired authorization code" },
    });

    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);
    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue({
      auth: { exchangeCodeForSession: mockExchange },
    } as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>);

    const req = createCallbackRequest("https://aceleraautocrm.com.br/auth/callback?code=expired_code");

    // Act
    const res = await GET(req);

    // Assert
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "https://aceleraautocrm.com.br/login?error=auth_callback_error"
    );
  });
});
