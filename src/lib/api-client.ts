/**
 * @file api-client.ts
 * @description Cliente HTTP centralizado e 100% tipado via openapi-fetch para consumo das APIs do CRM.
 */

import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "@/types/api";

/**
 * Middleware para injeção automática de Bearer Token e x-api-key no frontend.
 */
export const authMiddleware: Middleware = {
  async onRequest({ request }) {
    if (typeof window !== "undefined") {
      // 1. Injeção de Bearer Token JWT armazenado
      const token =
        window.localStorage.getItem("acelera_auth_token") ||
        window.sessionStorage.getItem("acelera_auth_token");

      if (token && !request.headers.has("Authorization")) {
        request.headers.set("Authorization", `Bearer ${token}`);
      }

      // 2. Injeção de x-api-key (quando aplicável para integrações webhooks/portais)
      const apiKey = window.localStorage.getItem("acelera_api_key");
      if (apiKey && !request.headers.has("x-api-key")) {
        request.headers.set("x-api-key", apiKey);
      }
    }

    return request;
  },

  async onResponse({ response }) {
    if (response.status === 401 && typeof window !== "undefined") {
      // Notifica a aplicação sobre sessão expirada para redirecionamento ou refresh
      window.dispatchEvent(new CustomEvent("acelera:unauthorized"));
    }
    return response;
  },
};

/**
 * Cliente HTTP tipado centralizado.
 * Fornece autocompletion estrito para todas as rotas de `paths`, parâmetros de URL e corpo da requisição.
 */
export const apiClient = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "",
});

apiClient.use(authMiddleware);

/**
 * Helper para armazenar ou limpar o token JWT no storage do cliente.
 */
export function setClientAuthToken(token: string | null): void {
  if (typeof window !== "undefined") {
    if (token) {
      window.localStorage.setItem("acelera_auth_token", token);
    } else {
      window.localStorage.removeItem("acelera_auth_token");
      window.sessionStorage.removeItem("acelera_auth_token");
    }
  }
}

/**
 * Helper para armazenar ou limpar a x-api-key no storage do cliente.
 */
export function setClientApiKey(apiKey: string | null): void {
  if (typeof window !== "undefined") {
    if (apiKey) {
      window.localStorage.setItem("acelera_api_key", apiKey);
    } else {
      window.localStorage.removeItem("acelera_api_key");
    }
  }
}

export default apiClient;
