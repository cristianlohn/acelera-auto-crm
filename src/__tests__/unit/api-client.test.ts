/**
 * @file api-client.test.ts
 * @description Testes unitários para o cliente HTTP tipado openapi-fetch e seus middlewares de autenticação.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  apiClient,
  authMiddleware,
  setClientAuthToken,
  setClientApiKey,
} from "@/lib/api-client";

describe("[UNIT-API-CLIENT] Cliente HTTP Tipado OpenAPI & Middlewares", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("deve instanciar o cliente apiClient com métodos HTTP principais", () => {
    expect(apiClient).toBeDefined();
    expect(typeof apiClient.GET).toBe("function");
    expect(typeof apiClient.POST).toBe("function");
    expect(typeof apiClient.PATCH).toBe("function");
    expect(typeof apiClient.DELETE).toBe("function");
  });

  it("authMiddleware: deve injetar o cabeçalho Authorization quando houver token no localStorage", async () => {
    window.localStorage.setItem("acelera_auth_token", "jwt-test-token-xyz");

    const req = new Request("http://localhost:3000/api/v1/leads", {
      method: "GET",
    });

    const modifiedReq = await authMiddleware.onRequest?.({
      id: "req-1",
      request: req,
      schemaPath: "/api/v1/leads",
      params: {} as Record<string, unknown>,
      options: {} as never,
    });

    expect(modifiedReq).toBeDefined();
    expect(modifiedReq?.headers.get("Authorization")).toBe("Bearer jwt-test-token-xyz");
  });

  it("authMiddleware: deve injetar o cabeçalho x-api-key quando houver chave no localStorage", async () => {
    window.localStorage.setItem("acelera_api_key", "acelera_live_sample_key_123");

    const req = new Request("http://localhost:3000/api/v1/webhooks/leads", {
      method: "POST",
    });

    const modifiedReq = await authMiddleware.onRequest?.({
      id: "req-2",
      request: req,
      schemaPath: "/api/v1/webhooks/leads",
      params: {} as Record<string, unknown>,
      options: {} as never,
    });

    expect(modifiedReq).toBeDefined();
    expect(modifiedReq?.headers.get("x-api-key")).toBe("acelera_live_sample_key_123");
  });

  it("authMiddleware: deve disparar evento 'acelera:unauthorized' em respostas 401", async () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    const res = new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

    await authMiddleware.onResponse?.({
      id: "req-3",
      request: new Request("http://localhost:3000/api/v1/leads"),
      response: res,
      schemaPath: "/api/v1/leads",
      params: {} as Record<string, unknown>,
      options: {} as never,
    });

    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe("acelera:unauthorized");
  });

  it("helpers: setClientAuthToken e setClientApiKey devem manipular storage corretamente", () => {
    setClientAuthToken("token-123");
    expect(window.localStorage.getItem("acelera_auth_token")).toBe("token-123");

    setClientAuthToken(null);
    expect(window.localStorage.getItem("acelera_auth_token")).toBeNull();

    setClientApiKey("key-456");
    expect(window.localStorage.getItem("acelera_api_key")).toBe("key-456");

    setClientApiKey(null);
    expect(window.localStorage.getItem("acelera_api_key")).toBeNull();
  });
});
