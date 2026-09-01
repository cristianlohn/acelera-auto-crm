/**
 * @file crm-routes.test.ts
 * @description Suíte de testes unitários para os módulos operacionais de domínio do CRM (/api/v1/*).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getLeadsHandler, POST as createLeadHandler } from "@/app/api/v1/leads/route";
import { GET as getLeadByIdHandler, PATCH as patchLeadHandler } from "@/app/api/v1/leads/[id]/route";
import { GET as getDistributionQueueHandler } from "@/app/api/v1/distribution/queue/route";
import { POST as assignLeadHandler } from "@/app/api/v1/distribution/assign/route";
import { GET as getVehiclesHandler, POST as createVehicleHandler } from "@/app/api/v1/vehicles/route";
import { GET as getApiKeysHandler, POST as createApiKeyHandler } from "@/app/api/v1/settings/api-keys/route";
import { DELETE as revokeApiKeyHandler } from "@/app/api/v1/settings/api-keys/[id]/route";
import { getApiDocs } from "@/lib/swagger";

function createCrmRequest(
  url: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body?: unknown,
  token = "jwt-access-token-123",
  extraHeaders: Record<string, string> = {}
) {
  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...extraHeaders,
    },
  };
  if (body !== undefined && method !== "GET") {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

describe("[UNIT-CRM] Módulos Operacionais de Domínio (Leads, Veículos, Roleta, API Keys)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Módulo de Leads (/api/v1/leads)", () => {
    it("GET: deve rejeitar requisição sem token Bearer com 401", async () => {
      const req = new NextRequest(new URL("/api/v1/leads", "http://localhost:3000"));
      const res = await getLeadsHandler(req);
      expect(res.status).toBe(401);
    });

    it("GET: deve listar leads paginados com metadados", async () => {
      const req = createCrmRequest("/api/v1/leads?page=1&limit=5", "GET");
      const res = await getLeadsHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data).toBeDefined();
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.page).toBe(1);
      expect(json.limit).toBe(5);
      expect(json.total).toBeDefined();
    });

    it("POST: deve criar um novo lead manualmente", async () => {
      const req = createCrmRequest("/api/v1/leads", "POST", {
        name: "Arthur Pendragon",
        phone: "11988881234",
        email: "arthur@camelot.com",
        vehicle_interest: "Jeep Commander 2024",
        origin: "patio_balcao",
        seller_name: "Rafael Alves",
        notes: "Cliente presencial",
      });

      const res = await createLeadHandler(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.lead_id).toBeDefined();
    });

    it("GET & PATCH /api/v1/leads/[id]: deve consultar e atualizar lead", async () => {
      const params = Promise.resolve({ id: "l-001" });

      const getReq = createCrmRequest("/api/v1/leads/l-001", "GET");
      const getRes = await getLeadByIdHandler(getReq, { params });
      expect(getRes.status).toBe(200);

      const patchReq = createCrmRequest("/api/v1/leads/l-001", "PATCH", {
        status: "visita",
        notes: "Visita agendada para sábado às 10h",
      });
      const patchRes = await patchLeadHandler(patchReq, { params });
      const patchJson = await patchRes.json();

      expect(patchRes.status).toBe(200);
      expect(patchJson.success).toBe(true);
      expect(patchJson.data.status).toBe("visita");
    });
  });

  describe("Módulo de Distribuição & Roleta (/api/v1/distribution)", () => {
    it("GET /queue: deve retornar o status da fila de vendedores", async () => {
      const req = createCrmRequest("/api/v1/distribution/queue", "GET");
      const res = await getDistributionQueueHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.queue).toBeDefined();
      expect(Array.isArray(json.queue)).toBe(true);
      expect(json.total_sellers).toBeGreaterThan(0);
    });

    it("POST /assign: deve atribuir lead para vendedor", async () => {
      const req = createCrmRequest("/api/v1/distribution/assign", "POST", {
        lead_id: "lead-1",
        seller_name: "Juliana Costa",
      });

      const res = await assignLeadHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.assigned_seller.name).toBe("Juliana Costa");
    });
  });

  describe("Módulo de Veículos (/api/v1/vehicles)", () => {
    it("GET: deve listar veículos em estoque", async () => {
      const req = createCrmRequest("/api/v1/vehicles", "GET");
      const res = await getVehiclesHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("POST: deve cadastrar veículo no estoque", async () => {
      const req = createCrmRequest("/api/v1/vehicles", "POST", {
        make: "Toyota",
        model: "Yaris XLS",
        year_fab: 2023,
        year_model: 2024,
        price: 98900,
        mileage: 12000,
        plate_last_digits: "ABC1D23",
        color: "Prata",
        fuel: "flex",
        transmission: "automatico",
        status: "disponivel",
      });

      const res = await createVehicleHandler(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.vehicle_id).toBeDefined();
    });
  });

  describe("Módulo de Configurações de API Keys (/api/v1/settings/api-keys)", () => {
    it("GET: deve listar as chaves de API", async () => {
      const req = createCrmRequest("/api/v1/settings/api-keys", "GET");
      const res = await getApiKeysHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("POST: deve retornar 401 se o token de autorização estiver ausente", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Nova Chave Sem Token" }),
      });

      const res = await createApiKeyHandler(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe("Token de autenticação não fornecido ou inválido.");
    });

    it("POST: deve rejeitar com 403 se o usuário não possuir papel administrativo", async () => {
      const req = createCrmRequest(
        "/api/v1/settings/api-keys",
        "POST",
        { name: "Chave Invalida" },
        "jwt-access-token-123",
        { "x-test-user-role": "vendedor" }
      );

      const res = await createApiKeyHandler(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toBe("Usuário não vinculado a uma organização ou sem permissão.");
    });

    it("POST: deve rejeitar com 403 se o usuário não pertencer a nenhum tenant", async () => {
      const req = createCrmRequest(
        "/api/v1/settings/api-keys",
        "POST",
        { name: "Chave Sem Tenant" },
        "jwt-access-token-123",
        { "x-test-org-id": "none" }
      );

      const res = await createApiKeyHandler(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toBe("Usuário não vinculado a uma organização ou sem permissão.");
    });

    it("POST: deve gerar nova chave com formato de resposta data, tenant_id e status active no retorno 201", async () => {
      const req = createCrmRequest("/api/v1/settings/api-keys", "POST", {
        name: "Integração Meta Ads",
        expires_in_days: 365,
      });

      const res = await createApiKeyHandler(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.message).toContain("Chave de API gerada com sucesso");

      // Validação do objeto aninhado data
      expect(json.data).toBeDefined();
      expect(json.data.id).toBeDefined();
      expect(json.data.name).toBe("Integração Meta Ads");
      expect(json.data.api_key).toBeDefined();
      expect(json.data.api_key.startsWith("acelera_live_")).toBe(true);
      expect(json.data.key_prefix).toBeDefined();
      expect(json.data.key_prefix.length).toBe(16);
      expect(json.data.tenant_id).toBeDefined();
      expect(json.data.expires_at).toBeDefined();
      expect(json.data.created_at).toBeDefined();

      // Compatibilidade com propriedades legadas
      expect(json.tenant_id).toBe(json.data.tenant_id);
      expect(json.created_by).toBeDefined();
      expect(json.status).toBe("active");
      expect(json.raw_key).toBe(json.data.api_key);
    });

    it("DELETE /api-keys/[id]: deve revogar chave existente", async () => {
      const params = Promise.resolve({ id: "key-meta-ads-01" });
      const req = createCrmRequest("/api/v1/settings/api-keys/key-meta-ads-01", "DELETE");
      const res = await revokeApiKeyHandler(req, { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
    });
  });

  describe("OpenAPI Documentation Spec", () => {
    it("deve conter todas as rotas operacionais do CRM na spec", () => {
      const spec = getApiDocs() as unknown as {
        paths?: Record<string, unknown>;
      };

      expect(spec.paths).toBeDefined();
      expect(spec.paths?.["/api/v1/leads"]).toBeDefined();
      expect(spec.paths?.["/api/v1/leads/{id}"]).toBeDefined();
      expect(spec.paths?.["/api/v1/distribution/queue"]).toBeDefined();
      expect(spec.paths?.["/api/v1/distribution/assign"]).toBeDefined();
      expect(spec.paths?.["/api/v1/vehicles"]).toBeDefined();
      expect(spec.paths?.["/api/v1/settings/api-keys"]).toBeDefined();
      expect(spec.paths?.["/api/v1/settings/api-keys/{id}"]).toBeDefined();
    });
  });
});
