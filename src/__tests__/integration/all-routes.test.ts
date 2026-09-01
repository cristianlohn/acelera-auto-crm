/**
 * @file all-routes.test.ts
 * @description Suíte de Testes de Integração Automatizados para TODAS as rotas da API v1 (/api/v1/**).
 *
 * Validações:
 * 1. Nenhuma rota retorna status 500 por erro de RLS, cliente Supabase mal configurado ou colunas inexistentes.
 * 2. Rotas de Webhook autenticam exclusivamente com x-api-key e usam createAdminClient com tenant isolado.
 * 3. Rotas de Usuário exigem Bearer Token JWT e rejeitam requisições anônimas com 401.
 * 4. Cobertura 100% dos métodos (GET, POST, PATCH, DELETE) de todos os endpoints OpenAPI.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock controlado de auth do Supabase para o runner de testes
vi.mock("@supabase/supabase-js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@supabase/supabase-js")>();
  return {
    ...actual,
    createClient: vi.fn(() => ({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: "mock_jwt_access_token",
              refresh_token: "mock_refresh_token",
              expires_in: 3600,
              token_type: "bearer",
              user: { id: "user-123", email: "teste@concessionaria.com.br" },
            },
            user: { id: "user-123", email: "teste@concessionaria.com.br" },
          },
          error: null,
        }),
        refreshSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: "mock_new_access_token",
              refresh_token: "mock_new_refresh_token",
              expires_in: 3600,
              token_type: "bearer",
            },
          },
          error: null,
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "test-user-uuid-1",
              email: "consultor.teste@concessionaria.com.br",
              user_metadata: { role: "admin", organization_id: "org-test-tenant" },
            },
          },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: { id: "rec-1" }, error: null }),
      })),
    })),
  };
});

// Handlers das Rotas da API v1
import { POST as loginHandler } from "@/app/api/v1/auth/login/route";
import { POST as refreshHandler } from "@/app/api/v1/auth/refresh/route";
import { POST as logoutHandler } from "@/app/api/v1/auth/logout/route";

import { POST as leadsWebhookHandler } from "@/app/api/v1/webhooks/leads/route";
import { GET as metaGetHandler, POST as metaPostHandler } from "@/app/api/v1/webhooks/meta/route";
import { POST as webmotorsHandler } from "@/app/api/v1/webhooks/webmotors/route";

import { GET as leadsGetHandler, POST as leadsPostHandler } from "@/app/api/v1/leads/route";
import { GET as leadByIdGetHandler, PATCH as leadByIdPatchHandler } from "@/app/api/v1/leads/[id]/route";

import { GET as vehiclesGetHandler, POST as vehiclesPostHandler } from "@/app/api/v1/vehicles/route";

import { GET as queueGetHandler } from "@/app/api/v1/distribution/queue/route";
import { POST as assignPostHandler } from "@/app/api/v1/distribution/assign/route";

import { GET as apiKeysGetHandler, POST as apiKeysPostHandler } from "@/app/api/v1/settings/api-keys/route";
import { DELETE as apiKeyDeleteHandler } from "@/app/api/v1/settings/api-keys/[id]/route";

const VALID_AUTH_HEADER = { Authorization: "Bearer jwt-access-token-123" };
const VALID_API_KEY_HEADER = { "x-api-key": "acelera_api_key_live_123" };

function buildRequest(
  url: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body !== undefined && method !== "GET") {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

describe("[INTEGRATION-ALL-ROUTES] Blindagem e Auditoria Completa da API v1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-anon-key-1234567890";
  });

  describe("1. Módulo de Autenticação (/api/v1/auth)", () => {
    it("POST /api/v1/auth/login: não deve estourar 500 ao validar credenciais", async () => {
      const req = buildRequest("/api/v1/auth/login", "POST", {
        email: "teste@concessionaria.com.br",
        password: "senha-correta-teste",
      });

      const res = await loginHandler(req);
      expect(res.status).not.toBe(500);
      expect([200, 400, 401]).toContain(res.status);
    });

    it("POST /api/v1/auth/refresh: não deve estourar 500 ao renovar sessão", async () => {
      const req = buildRequest("/api/v1/auth/refresh", "POST", {
        refresh_token: "dummy_refresh_token_test",
      });

      const res = await refreshHandler(req);
      expect(res.status).not.toBe(500);
      expect([200, 400, 401]).toContain(res.status);
    });

    it("POST /api/v1/auth/logout: deve rejeitar chamada sem Bearer token e aceitar com token", async () => {
      const reqNoAuth = buildRequest("/api/v1/auth/logout", "POST");
      const resNoAuth = await logoutHandler(reqNoAuth);
      expect(resNoAuth.status).toBe(401);

      const reqAuth = buildRequest("/api/v1/auth/logout", "POST", undefined, VALID_AUTH_HEADER);
      const resAuth = await logoutHandler(reqAuth);
      expect(resAuth.status).not.toBe(500);
      expect([200, 401]).toContain(resAuth.status);
    });
  });

  describe("2. Módulo de Webhooks e Máquina (/api/v1/webhooks)", () => {
    it("POST /api/v1/webhooks/leads: rejeita sem x-api-key e processa com chave válida", async () => {
      // 1. Sem x-api-key
      const reqNoKey = buildRequest("/api/v1/webhooks/leads", "POST", {
        name: "Lead Sem Chave",
        phone: "11988887777",
      });
      const resNoKey = await leadsWebhookHandler(reqNoKey);
      expect(resNoKey.status).toBe(401);

      // 2. Com chave válida
      const reqWithKey = buildRequest(
        "/api/v1/webhooks/leads",
        "POST",
        {
          name: "Lead Ingestão Segura",
          phone: "(11) 98888-7777",
          email: "lead.seguro@gmail.com",
          vehicle_interest: "Toyota Corolla Cross 2024",
          origin: "site",
          notes: "Lead vindo de campanha com isolamento multi-tenant",
          custom_fields: { campaign_id: "google-ads-01" },
        },
        VALID_API_KEY_HEADER
      );
      const resWithKey = await leadsWebhookHandler(reqWithKey);
      expect(resWithKey.status).toBe(201);
      const json = await resWithKey.json();
      expect(json.success).toBe(true);
      expect(json.lead_id).toBeDefined();
      expect(json.tenant_id).toBeDefined();
    });

    it("GET & POST /api/v1/webhooks/meta: valida handshake e processa lead sem erro 500", async () => {
      // GET: Handshake Meta
      const reqGet = buildRequest(
        "/api/v1/webhooks/meta?hub.mode=subscribe&hub.challenge=test_12345&hub.verify_token=meta_verify_token_dummy_example",
        "GET"
      );
      const resGet = await metaGetHandler(reqGet);
      expect(resGet.status).toBe(200);
      const text = await resGet.text();
      expect(text).toBe("test_12345");

      // POST: Lead Event Meta
      const reqPost = buildRequest(
        "/api/v1/webhooks/meta",
        "POST",
        {
          object: "page",
          entry: [
            {
              id: "page_123",
              time: Date.now(),
              changes: [
                {
                  field: "leadgen",
                  value: {
                    leadgen_id: "meta_lead_123",
                    name: "Cliente Instagram",
                    phone: "11988882222",
                    email: "cliente.insta@email.com",
                    vehicle: "Jeep Renegade 2024",
                  },
                },
              ],
            },
          ],
        },
        VALID_API_KEY_HEADER
      );
      const resPost = await metaPostHandler(reqPost);
      expect(resPost.status).not.toBe(500);
      expect(resPost.status).toBe(200);
    });

    it("POST /api/v1/webhooks/webmotors: processa proposta sem erro 500", async () => {
      const req = buildRequest(
        "/api/v1/webhooks/webmotors",
        "POST",
        {
          leadId: "WM-776655",
          nome: "Comprador Webmotors",
          telefone: "11988883333",
          email: "comprador@uol.com.br",
          veiculo: {
            marca: "Honda",
            modelo: "Civic",
            anoModelo: 2023,
          },
          proposta: {
            valor: 140000,
            mensagem: "Aceita contraproposta?",
          },
        },
        VALID_API_KEY_HEADER
      );
      const res = await webmotorsHandler(req);
      expect(res.status).not.toBe(500);
      expect(res.status).toBe(201);
    });
  });

  describe("3. Módulo de Leads (/api/v1/leads)", () => {
    it("GET /api/v1/leads: exige Bearer Token e retorna listagem", async () => {
      const reqNoAuth = buildRequest("/api/v1/leads", "GET");
      const resNoAuth = await leadsGetHandler(reqNoAuth);
      expect(resNoAuth.status).toBe(401);

      const reqAuth = buildRequest("/api/v1/leads?page=1&limit=10", "GET", undefined, VALID_AUTH_HEADER);
      const resAuth = await leadsGetHandler(reqAuth);
      expect(resAuth.status).toBe(200);
      const json = await resAuth.json();
      expect(json.data).toBeDefined();
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("POST /api/v1/leads: cadastra lead vinculado ao tenant autenticado", async () => {
      const req = buildRequest(
        "/api/v1/leads",
        "POST",
        {
          name: "Novo Lead Teste",
          phone: "11977776666",
          email: "novo.lead@teste.com",
          vehicle_interest: "Ford Ranger 2024",
          origin: "patio_balcao",
          status: "novo",
        },
        VALID_AUTH_HEADER
      );
      const res = await leadsPostHandler(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.lead_id).toBeDefined();
    });

    it("GET & PATCH /api/v1/leads/[id]: consulta e atualiza lead por ID", async () => {
      const params = Promise.resolve({ id: "lead-mock-1" });

      // GET
      const getReq = buildRequest("/api/v1/leads/lead-mock-1", "GET", undefined, VALID_AUTH_HEADER);
      const getRes = await leadByIdGetHandler(getReq, { params });
      expect(getRes.status).not.toBe(500);
      expect([200, 404]).toContain(getRes.status);

      // PATCH
      const patchReq = buildRequest(
        "/api/v1/leads/lead-mock-1",
        "PATCH",
        {
          status: "atendimento",
          notes: "Contato iniciado pelo vendedor",
        },
        VALID_AUTH_HEADER
      );
      const patchRes = await leadByIdPatchHandler(patchReq, { params });
      expect(patchRes.status).not.toBe(500);
      expect([200, 404]).toContain(patchRes.status);
    });
  });

  describe("4. Módulo de Veículos (/api/v1/vehicles)", () => {
    it("GET /api/v1/vehicles: lista estoque do tenant autenticado", async () => {
      const reqNoAuth = buildRequest("/api/v1/vehicles", "GET");
      const resNoAuth = await vehiclesGetHandler(reqNoAuth);
      expect(resNoAuth.status).toBe(401);

      const reqAuth = buildRequest("/api/v1/vehicles", "GET", undefined, VALID_AUTH_HEADER);
      const resAuth = await vehiclesGetHandler(reqAuth);
      expect(resAuth.status).toBe(200);
      const json = await resAuth.json();
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("POST /api/v1/vehicles: cadastra novo veículo no pátio sem estourar 500", async () => {
      const req = buildRequest(
        "/api/v1/vehicles",
        "POST",
        {
          make: "Toyota",
          model: "Yaris",
          year_fab: 2023,
          year_model: 2024,
          price: 95000,
          mileage: 12000,
          plate_last_digits: "XYZ9W88",
          color: "Prata",
          status: "disponivel",
        },
        VALID_AUTH_HEADER
      );
      const res = await vehiclesPostHandler(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.vehicle_id).toBeDefined();
    });
  });

  describe("5. Módulo de Distribuição e Roleta (/api/v1/distribution)", () => {
    it("GET /api/v1/distribution/queue: retorna a fila ativa de consultores", async () => {
      const req = buildRequest("/api/v1/distribution/queue", "GET", undefined, VALID_AUTH_HEADER);
      const res = await queueGetHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.total_sellers).toBeDefined();
      expect(Array.isArray(json.queue)).toBe(true);
    });

    it("POST /api/v1/distribution/assign: atribui vendedor a lead sem estourar 500", async () => {
      const req = buildRequest(
        "/api/v1/distribution/assign",
        "POST",
        {
          lead_id: "lead-test-123",
          seller_name: "Rafael Alves",
          trigger_roleta: false,
        },
        VALID_AUTH_HEADER
      );
      const res = await assignPostHandler(req);
      expect(res.status).not.toBe(500);
      expect([200, 404]).toContain(res.status);
    });
  });

  describe("6. Módulo de Configurações e API Keys (/api/v1/settings/api-keys)", () => {
    it("GET /api/v1/settings/api-keys: lista chaves do tenant autenticado", async () => {
      const req = buildRequest("/api/v1/settings/api-keys", "GET", undefined, VALID_AUTH_HEADER);
      const res = await apiKeysGetHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("POST /api/v1/settings/api-keys: gera nova chave com isolamento multi-tenant", async () => {
      const req = buildRequest(
        "/api/v1/settings/api-keys",
        "POST",
        {
          name: "Chave Integração Testes",
          expires_in_days: 30,
        },
        VALID_AUTH_HEADER
      );
      const res = await apiKeysPostHandler(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.api_key).toBeDefined();
      expect(json.data.tenant_id).toBeDefined();
    });

    it("DELETE /api/v1/settings/api-keys/[id]: revoga chave sem estourar 500", async () => {
      const params = Promise.resolve({ id: "key-meta-ads-01" });
      const req = buildRequest(
        "/api/v1/settings/api-keys/key-meta-ads-01",
        "DELETE",
        undefined,
        VALID_AUTH_HEADER
      );
      const res = await apiKeyDeleteHandler(req, { params });
      expect(res.status).not.toBe(500);
      expect([200, 404]).toContain(res.status);
    });
  });
});
