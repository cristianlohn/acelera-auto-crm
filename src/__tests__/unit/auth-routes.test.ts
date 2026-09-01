/**
 * @file auth-routes.test.ts
 * @description Suíte de testes unitários para os endpoints de autenticação /api/v1/auth/*.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as loginHandler } from "@/app/api/v1/auth/login/route";
import { POST as refreshHandler } from "@/app/api/v1/auth/refresh/route";
import { POST as logoutHandler } from "@/app/api/v1/auth/logout/route";
import { getApiDocs } from "@/lib/swagger";

// Mock do @supabase/supabase-js para controlar as respostas de auth nos testes
const mockSignInWithPassword = vi.fn();
const mockRefreshSession = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      refreshSession: mockRefreshSession,
      signOut: mockSignOut,
    },
  })),
}));

function createJsonRequest(url: string, body?: unknown, headers: Record<string, string> = {}) {
  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

describe("[UNIT-AUTH] Endpoints de Autenticação Desacoplada (/api/v1/auth)", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-anon-key";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  });

  describe("POST /api/v1/auth/login", () => {
    it("deve retornar 500 se as variáveis de ambiente do Supabase estiverem ausentes", async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      const req = createJsonRequest("/api/v1/auth/login", {
        email: "usuario@teste.com",
        password: "password123",
      });

      const res = await loginHandler(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Configuração do Supabase ausente nas variáveis de ambiente");
    });

    it("deve retornar 400 se o payload estiver vazio ou com e-mail inválido", async () => {
      const reqEmpty = createJsonRequest("/api/v1/auth/login", {});
      const resEmpty = await loginHandler(reqEmpty);
      expect(resEmpty.status).toBe(400);

      const reqInvalidEmail = createJsonRequest("/api/v1/auth/login", {
        email: "email-invalido",
        password: "123",
      });
      const resInvalidEmail = await loginHandler(reqInvalidEmail);
      expect(resInvalidEmail.status).toBe(400);
    });

    it("deve retornar 401 quando as credenciais forem incorretas", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: "Invalid login credentials" },
      });

      const req = createJsonRequest("/api/v1/auth/login", {
        email: "usuario@teste.com",
        password: "wrong-password",
      });

      const res = await loginHandler(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe("Credenciais inválidas.");
    });

    it("deve retornar 200 com access_token, refresh_token e dados do usuário no login bem-sucedido", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: {
          session: {
            access_token: "access-token-123",
            refresh_token: "refresh-token-456",
            expires_in: 3600,
          },
          user: {
            id: "user-uuid-1",
            email: "gerente@concessionaria.com",
          },
        },
        error: null,
      });

      const req = createJsonRequest("/api/v1/auth/login", {
        email: "gerente@concessionaria.com",
        password: "Password123!",
      });

      const res = await loginHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.access_token).toBe("access-token-123");
      expect(json.refresh_token).toBe("refresh-token-456");
      expect(json.token_type).toBe("Bearer");
      expect(json.expires_in).toBe(3600);
      expect(json.user.id).toBe("user-uuid-1");
      expect(json.user.email).toBe("gerente@concessionaria.com");
    });
  });

  describe("POST /api/v1/auth/refresh", () => {
    it("deve retornar 500 se as variáveis de ambiente do Supabase estiverem ausentes", async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const req = createJsonRequest("/api/v1/auth/refresh", {
        refresh_token: "token_123",
      });

      const res = await refreshHandler(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Configuração do Supabase ausente nas variáveis de ambiente");
    });

    it("deve retornar 400 se refresh_token não for fornecido", async () => {
      const req = createJsonRequest("/api/v1/auth/refresh", {});
      const res = await refreshHandler(req);
      expect(res.status).toBe(400);
    });

    it("deve retornar 401 se o refresh_token for inválido ou expirado", async () => {
      mockRefreshSession.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: "Invalid Refresh Token" },
      });

      const req = createJsonRequest("/api/v1/auth/refresh", {
        refresh_token: "expired_token_123",
      });

      const res = await refreshHandler(req);
      expect(res.status).toBe(401);
    });

    it("deve retornar 200 com novo par de tokens ao renovar com sucesso", async () => {
      mockRefreshSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: "new-access-token-789",
            refresh_token: "new-refresh-token-012",
            expires_in: 3600,
          },
          user: {
            id: "user-uuid-1",
            email: "vendedor@concessionaria.com",
          },
        },
        error: null,
      });

      const req = createJsonRequest("/api/v1/auth/refresh", {
        refresh_token: "valid_refresh_token_456",
      });

      const res = await refreshHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.access_token).toBe("new-access-token-789");
      expect(json.refresh_token).toBe("new-refresh-token-012");
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("deve retornar 401 se o header Authorization Bearer estiver ausente", async () => {
      const req = createJsonRequest("/api/v1/auth/logout");
      const res = await logoutHandler(req);
      expect(res.status).toBe(401);
    });

    it("deve retornar 200 ao invalidar a sessão com token Bearer", async () => {
      mockSignOut.mockResolvedValueOnce({ error: null });

      const req = createJsonRequest(
        "/api/v1/auth/logout",
        undefined,
        { Authorization: "Bearer valid-token-123" }
      );

      const res = await logoutHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("Sessão encerrada com sucesso");
    });
  });

  describe("OpenAPI Documentation Spec", () => {
    it("deve conter as rotas de auth registradas na spec OpenAPI", () => {
      const spec = getApiDocs() as unknown as {
        paths?: Record<string, unknown>;
      };

      expect(spec.paths).toBeDefined();
      expect(spec.paths?.["/api/v1/auth/login"]).toBeDefined();
      expect(spec.paths?.["/api/v1/auth/refresh"]).toBeDefined();
      expect(spec.paths?.["/api/v1/auth/logout"]).toBeDefined();
    });
  });
});
