/**
 * @file webhook-routes.test.ts
 * @description Suíte de testes unitários para a camada de Webhooks (/api/v1/webhooks/*).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as genericLeadWebhookHandler } from "@/app/api/v1/webhooks/leads/route";
import { GET as metaGetHandler, POST as metaPostHandler } from "@/app/api/v1/webhooks/meta/route";
import { POST as webmotorsWebhookHandler } from "@/app/api/v1/webhooks/webmotors/route";
import { getApiDocs } from "@/lib/swagger";

function createWebhookRequest(
  url: string,
  method: "GET" | "POST",
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
  if (body !== undefined && method === "POST") {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

describe("[UNIT-WEBHOOKS] Ingestão de Leads, Webhooks e Portais (/api/v1/webhooks)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/webhooks/leads (Ingestão Genérica)", () => {
    it("deve retornar 401 se a chave de API estiver ausente", async () => {
      const req = createWebhookRequest("/api/v1/webhooks/leads", "POST", {
        name: "Carlos Teste",
        phone: "11988887777",
      });

      const res = await genericLeadWebhookHandler(req);
      expect(res.status).toBe(401);
    });

    it("deve retornar 401 se a chave de API for inválida", async () => {
      const req = createWebhookRequest(
        "/api/v1/webhooks/leads",
        "POST",
        { name: "Carlos Teste", phone: "11988887777" },
        { "x-api-key": "chave_inexistente_999" }
      );

      const res = await genericLeadWebhookHandler(req);
      expect(res.status).toBe(401);
    });

    it("deve retornar 400 se o payload estiver incompleto ou com telefone inválido", async () => {
      const req = createWebhookRequest(
        "/api/v1/webhooks/leads",
        "POST",
        { name: "C", phone: "123" },
        { "x-api-key": "acelera_api_key_live_123" }
      );

      const res = await genericLeadWebhookHandler(req);
      expect(res.status).toBe(400);
    });

    it("deve retornar 201 ao processar lead válido com sanitização e roleta", async () => {
      const req = createWebhookRequest(
        "/api/v1/webhooks/leads",
        "POST",
        {
          name: "Julio Cesar",
          phone: "(11) 98765-4321",
          email: "julio.cesar@gmail.com",
          vehicle_interest: "Honda HR-V Touring 2024",
          origin: "landing_page",
          notes: "Interesse em financiamento com 50% de entrada.",
        },
        { "x-api-key": "acelera_api_key_live_123" }
      );

      const res = await genericLeadWebhookHandler(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.message).toBe("Lead registrado com sucesso.");
      expect(json.tenant_id).toBeDefined();
      expect(json.status).toBe("received");
      expect(json.assigned_to).toBeDefined();
      expect(json.lead_id).toBeDefined();
    });

    it("deve processar lead com custom_fields e fallback de origem quando omitido", async () => {
      const req = createWebhookRequest(
        "/api/v1/webhooks/leads",
        "POST",
        {
          name: "Mariana Costa",
          phone: "11977778888",
          custom_fields: { utm_campaign: "google_search", lead_score: 95 },
        },
        { "x-api-key": "acelera_api_key_live_123" }
      );

      const res = await genericLeadWebhookHandler(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.lead_id).toBeDefined();
      expect(json.tenant_id).toBeDefined();
    });

    it("deve ignorar seller_id igual a 'string', 'null' ou vazio e acionar a Roleta Round-Robin", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      const req = createWebhookRequest(
        "/api/v1/webhooks/leads",
        "POST",
        {
          name: "Roberto Silva",
          phone: "47999998888",
          seller_id: "string",
          seller_name: "null",
        },
        { "x-api-key": "acelera_api_key_live_123" }
      );

      const res = await genericLeadWebhookHandler(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.assigned_to).toBeDefined();
      // Não deve atribuir ao literal 'string' ou 'null'
      expect(json.assigned_to).not.toBe("string");
      expect(json.assigned_to).not.toBe("null");

      // Verifica se o log canônico [Roleta] Consultor selecionado foi emitido
      expect(consoleSpy).toHaveBeenCalledWith(
        "[Roleta] Consultor selecionado:",
        expect.any(String),
        "Telefone:",
        expect.any(String)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("GET & POST /api/v1/webhooks/meta (Meta Lead Ads)", () => {
    it("GET: deve responder ao handshake de verificação do Meta com o challenge", async () => {
      const challengeCode = "99887766";
      const req = createWebhookRequest(
        `/api/v1/webhooks/meta?hub.mode=subscribe&hub.verify_token=meta_verify_token_dummy_example&hub.challenge=${challengeCode}`,
        "GET"
      );

      const res = await metaGetHandler(req);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe(challengeCode);
    });

    it("GET: deve retornar 403 se o token de verificação for incorreto", async () => {
      const req = createWebhookRequest(
        "/api/v1/webhooks/meta?hub.mode=subscribe&hub.verify_token=token_errado&hub.challenge=123",
        "GET"
      );

      const res = await metaGetHandler(req);
      expect(res.status).toBe(403);
    });

    it("POST: deve processar evento de lead do Meta Ads", async () => {
      const req = createWebhookRequest(
        "/api/v1/webhooks/meta",
        "POST",
        {
          object: "page",
          entry: [
            {
              id: "page-123",
              changes: [
                {
                  field: "leadgen",
                  value: {
                    leadgen_id: "lead-meta-001",
                    form_id: "form-feirao-2026",
                    name: "Fernanda Meta Lead",
                    phone: "11988889999",
                    vehicle: "Jeep Compass 2024",
                  },
                },
              ],
            },
          ],
        },
        { "x-api-key": "acelera_api_key_live_123" }
      );

      const res = await metaPostHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.assigned_to).toBeDefined();
    });
  });

  describe("POST /api/v1/webhooks/webmotors (Ingestão Webmotors)", () => {
    it("deve mapear os campos da proposta Webmotors e retornar 201", async () => {
      const req = createWebhookRequest(
        "/api/v1/webhooks/webmotors",
        "POST",
        {
          leadId: "WM-776655",
          nome: "Rodrigo Webmotors",
          telefone: "(11) 97777-8888",
          email: "rodrigo.wm@uol.com.br",
          veiculo: {
            marca: "Toyota",
            modelo: "Corolla",
            versao: "2.0 XEi",
            anoModelo: 2023,
            preco: 138000,
          },
          proposta: {
            valor: 135000,
            mensagem: "Tenho interesse imediato",
            possuiTroca: false,
          },
        },
        { "x-api-key": "acelera_api_key_live_123" }
      );

      const res = await webmotorsWebhookHandler(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.portal).toBe("webmotors");
      expect(json.assigned_to).toBeDefined();
    });
  });

  describe("OpenAPI Documentation Spec", () => {
    it("deve conter as rotas de webhooks registradas na spec OpenAPI", () => {
      const spec = getApiDocs() as unknown as {
        paths?: Record<string, unknown>;
      };

      expect(spec.paths).toBeDefined();
      expect(spec.paths?.["/api/v1/webhooks/leads"]).toBeDefined();
      expect(spec.paths?.["/api/v1/webhooks/meta"]).toBeDefined();
      expect(spec.paths?.["/api/v1/webhooks/webmotors"]).toBeDefined();
    });
  });
});
