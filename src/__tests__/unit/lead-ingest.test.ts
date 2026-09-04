/**
 * @file lead-ingest.test.ts
 * @description Suíte de testes unitários para os parsers de Webmotors e Meta Ads, match de estoque e Route Handler de ingestão.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { parseWebmotorsPayload } from "@/lib/services/ingestion/parsers/webmotors-parser";
import { parseMetaAdsPayload } from "@/lib/services/ingestion/parsers/meta-parser";
import { matchVehicleInInventory } from "@/lib/services/ingestion/vehicle-matcher";
import { POST as handleIngestRoute } from "@/app/api/v1/leads/ingest/route";
import * as notificationService from "@/lib/services/whatsapp/notification-service";
import * as roletaService from "@/lib/services/roleta/roleta-service";

// Mock do Supabase Admin
let mockVehicleList: Array<Record<string, unknown>> = [];
let mockLeadList: Array<Record<string, unknown>> = [];
let lastInsertedLead: Record<string, unknown> | null = null;

vi.mock("@/lib/supabase/server", () => ({
  isSupabaseServerConfigured: vi.fn(() => true),
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockImplementation(() => ({
    from: vi.fn().mockImplementation((table: string) => {
      const builder: Record<string, unknown> = {
        _filters: {} as Record<string, unknown>,
        _ilike: null as { col: string; pattern: string } | null,
        select: vi.fn(() => builder),
        eq: vi.fn((col: string, val: unknown) => {
          (builder._filters as Record<string, unknown>)[col] = val;
          return builder;
        }),
        ilike: vi.fn((col: string, pattern: string) => {
          builder._ilike = { col, pattern: pattern.replace(/%/g, "").toLowerCase() };
          return builder;
        }),
        gte: vi.fn(() => builder),
        lte: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        order: vi.fn(() => builder),
        update: vi.fn(() => builder),
        then: vi.fn((resolve: (val: unknown) => void) => resolve({ data: table === "leads" ? mockLeadList : [], error: null })),
        single: vi.fn().mockImplementation(async () => {
          if (table === "organizations") {
            return { data: { id: "org-loja-001", name: "Auto Prime Motors" }, error: null };
          }
          if (table === "leads" && lastInsertedLead) {
            return { data: lastInsertedLead, error: null };
          }
          return { data: null, error: new Error("Not found") };
        }),
        maybeSingle: vi.fn().mockImplementation(async () => {
          if (table === "vehicles") {
            const filters = builder._filters as Record<string, unknown>;
            const match = mockVehicleList.find((v) => {
              if (filters.id && v.id !== filters.id) {
                return false;
              }
              const ilikeInfo = builder._ilike as { col: string; pattern: string } | null;
              if (ilikeInfo) {
                const val = String(v[ilikeInfo.col] || "").toLowerCase();
                return val.includes(ilikeInfo.pattern);
              }
              return true;
            });
            return { data: match || null, error: null };
          }
          if (table === "leads") {
            return { data: mockLeadList[0] || null, error: null };
          }
          return { data: null, error: null };
        }),
        insert: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
          lastInsertedLead = { ...payload, id: payload.id || "lead-inserted-999" };
          return {
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: lastInsertedLead, error: null }),
              maybeSingle: vi.fn().mockResolvedValue({ data: lastInsertedLead, error: null }),
            })),
          };
        }),
      };
      return builder;
    }),
  })),
}));

describe("[UNIT-LEAD-INGESTION] Parsers de Portais, Match de Estoque e Ingestão Unificada", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVehicleList = [];
    mockLeadList = [];
    lastInsertedLead = null;
  });

  describe("1. Parser Webmotors (parseWebmotorsPayload)", () => {
    it("[TEST-WEBMOTORS-1] deve extrair corretamente nome, telefone, mensagem e pistas do veículo", () => {
      const payload = {
        lead: {
          id: "wm-lead-7788",
          message: "Aceita troca por seminovo?",
          customer: {
            name: "Fernando Martins",
            phone: "(11) 98765-1122",
            email: "fernando@email.com",
          },
          vehicle: {
            adId: "AD-9921",
            plate: "ABC-1234",
            make: "Honda",
            model: "Civic",
            version: "EXL 2.0 CVT",
          },
        },
      };

      const normalized = parseWebmotorsPayload(payload);

      expect(normalized.source).toBe("webmotors");
      expect(normalized.externalId).toBe("wm-lead-7788");
      expect(normalized.clientName).toBe("Fernando Martins");
      expect(normalized.clientPhone).toBe("(11) 98765-1122");
      expect(normalized.clientEmail).toBe("fernando@email.com");
      expect(normalized.message).toBe("Aceita troca por seminovo?");
      expect(normalized.vehicleHint).toEqual({
        adId: "AD-9921",
        plate: "ABC-1234",
        brand: "Honda",
        model: "Civic",
        version: "EXL 2.0 CVT",
      });
    });

    it("[TEST-WEBMOTORS-2] deve preencher fallbacks graciosos para payloads simplificados da Webmotors", () => {
      const payload = {
        customer: {
          phone: "11988887777",
        },
      };

      const normalized = parseWebmotorsPayload(payload);

      expect(normalized.clientName).toBe("Lead Webmotors");
      expect(normalized.clientPhone).toBe("11988887777");
      expect(normalized.source).toBe("webmotors");
    });
  });

  describe("2. Parser Meta Lead Ads (parseMetaAdsPayload)", () => {
    it("[TEST-META-1] deve mapear perguntas de formulário dinâmico do Instagram/Facebook", () => {
      const payload = {
        leadgen_id: "meta-lead-9900",
        ad_name: "Campanha Corolla Cross",
        field_data: [
          { name: "full_name", values: ["Beatriz Lima"] },
          { name: "phone_number", values: ["+5511999993333"] },
          { name: "email", values: ["beatriz@meta.com"] },
          { name: "veiculo", values: ["Toyota Corolla Cross XRE"] },
          { name: "mensagem", values: ["Tenho interesse em financiamento sem entrada."] },
        ],
      };

      const normalized = parseMetaAdsPayload(payload);

      expect(normalized.source).toBe("meta_ads");
      expect(normalized.externalId).toBe("meta-lead-9900");
      expect(normalized.clientName).toBe("Beatriz Lima");
      expect(normalized.clientPhone).toBe("+5511999993333");
      expect(normalized.clientEmail).toBe("beatriz@meta.com");
      expect(normalized.vehicleHint?.model).toBe("Toyota Corolla Cross XRE");
      expect(normalized.message).toBe("Tenho interesse em financiamento sem entrada.");
    });
  });

  describe("3. Algoritmo de Match de Estoque (matchVehicleInInventory)", () => {
    it("[TEST-MATCH-1] deve localizar veículo por dígitos da placa", async () => {
      mockVehicleList = [
        {
          id: "v-civic-1",
          make: "Honda",
          model: "Civic EXL",
          version: "2.0 Flex",
          price: 145000,
          year_model: 2023,
          plate_last_digits: "234",
        },
      ];

      const matched = await matchVehicleInInventory("org-loja-001", { plate: "ABC-1234" });

      expect(matched).not.toBeNull();
      expect(matched?.id).toBe("v-civic-1");
      expect(matched?.model).toBe("Civic EXL");
      expect(matched?.price).toBe(145000);
    });

    it("[TEST-MATCH-2] deve localizar veículo por correspondência de modelo quando placa não for fornecida", async () => {
      mockVehicleList = [
        {
          id: "v-compass-2",
          make: "Jeep",
          model: "Compass Limited",
          version: "1.3 Turbo",
          price: 180000,
          year_model: 2024,
          plate_last_digits: "987",
        },
      ];

      const matched = await matchVehicleInInventory("org-loja-001", { model: "Compass 2024" });

      expect(matched).not.toBeNull();
      expect(matched?.id).toBe("v-compass-2");
      expect(matched?.brand).toBe("Jeep");
    });

    it("[TEST-MATCH-3] deve retornar null caso nenhum veículo seja encontrado", async () => {
      mockVehicleList = [];
      const matched = await matchVehicleInInventory("org-loja-001", { model: "Ferrari 488" });
      expect(matched).toBeNull();
    });

    it("[TEST-MATCH-4] deve normalizar acentos para que 'Ká' encontre 'Ka'", async () => {
      mockVehicleList = [
        {
          id: "v-ka-3",
          make: "Ford",
          model: "Ka SE",
          version: "1.0",
          price: 45000,
          year_model: 2020,
          plate_last_digits: "456",
        },
      ];

      const matched = await matchVehicleInInventory("org-loja-001", { model: "Ká 2020" });
      expect(matched).not.toBeNull();
      expect(matched?.id).toBe("v-ka-3");
      expect(matched?.model).toBe("Ka SE");
      expect(matched?.brand).toBe("Ford");
    });

    it("[TEST-MATCH-5] deve localizar veículo diretamente por adId e sanitizar colunas alternativas de preço (sale_price / preco)", async () => {
      mockVehicleList = [
        {
          id: "AD-9921",
          brand: "Toyota",
          model: "Corolla Altis",
          version: "Hybrid",
          sale_price: 175000,
          year: 2024,
        },
      ];

      const matched = await matchVehicleInInventory("org-loja-001", { adId: "AD-9921" });
      expect(matched).not.toBeNull();
      expect(matched?.id).toBe("AD-9921");
      expect(matched?.brand).toBe("Toyota");
      expect(matched?.model).toBe("Corolla Altis");
      expect(matched?.price).toBe(175000);
      expect(matched?.year).toBe(2024);
    });
  });

  describe("4. Route Handler Unificado POST /api/v1/leads/ingest", () => {
    it("[TEST-ROUTE-INGEST-1] deve retornar 401 quando nenhuma API key for fornecida", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/leads/ingest", {
        method: "POST",
        body: JSON.stringify({ name: "Teste" }),
      });

      const res = await handleIngestRoute(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("Token de autenticação da loja obrigatório");
    });

    it("[TEST-ROUTE-INGEST-2] deve processar lead com sucesso, acionar roleta, persistir short_code e notificar via WhatsApp", async () => {
      vi.spyOn(roletaService, "assignLeadThroughRoleta").mockResolvedValue({
        id: "seller-carlos-123",
        name: "Carlos Vendedor",
        phone: "11999998888",
      });

      const notificationSpy = vi
        .spyOn(notificationService, "sendSellerLeadNotification")
        .mockResolvedValue({ success: true, messageId: "msg-123" });

      mockVehicleList = [
        {
          id: "v-civic-1",
          make: "Honda",
          model: "Civic Touring",
          version: "1.5 Turbo",
          price: 160000,
          year_model: 2023,
          plate_last_digits: "567",
        },
      ];

      const req = new NextRequest("http://localhost:3000/api/v1/leads/ingest?source=webmotors", {
        method: "POST",
        headers: {
          "x-api-key": "acelera_api_key_live_123",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          lead: {
            customer: { name: "Lucas Rocha", phone: "11977778888" },
            vehicle: { model: "Civic", plate: "XYZ-4567" },
          },
        }),
      });

      const res = await handleIngestRoute(req);

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.assignedTo).toBe("Carlos Vendedor");
      expect(json.matchedVehicle).toBe("Civic Touring");
      expect(json.shortCode).toHaveLength(6);
      expect(json.whatsapp).toEqual({ sent: true, error: null });

      expect(lastInsertedLead?.estimated_value).toBe(160000);
      expect(lastInsertedLead?.vehicle_id).toBe("v-civic-1");

      expect(notificationSpy).toHaveBeenCalled();
    });

    it("[TEST-ROUTE-INGEST-2.1] deve capturar erro de envio do WhatsApp e retornar diagnóstico no JSON sem quebrar criação 201", async () => {
      vi.spyOn(roletaService, "assignLeadThroughRoleta").mockResolvedValue({
        id: "seller-carlos-123",
        name: "Carlos Vendedor",
        phone: "11999998888",
      });

      vi.spyOn(notificationService, "sendSellerLeadNotification").mockRejectedValue(
        new Error("Falha na conexão com VPS WhatsApp")
      );

      const req = new NextRequest("http://localhost:3000/api/v1/leads/ingest?source=webmotors", {
        method: "POST",
        headers: {
          "x-api-key": "acelera_api_key_live_123",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          lead: {
            customer: { name: "Lucas Rocha", phone: "11977778888" },
            vehicle: { model: "Civic" },
          },
        }),
      });

      const res = await handleIngestRoute(req);

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.whatsapp).toEqual({
        sent: false,
        error: "Falha na conexão com VPS WhatsApp",
      });
    });

    it("[TEST-ROUTE-INGEST-3] deve evitar duplicação por externalId (Idempotência)", async () => {
      mockLeadList = [{ id: "existing-lead-001" }];

      const req = new NextRequest("http://localhost:3000/api/v1/leads/ingest?source=meta_ads", {
        method: "POST",
        headers: {
          "x-api-key": "acelera_api_key_live_123",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          leadgen_id: "existing-lead-001",
          field_data: [
            { name: "full_name", values: ["Lucas Rocha"] },
            { name: "phone_number", values: ["11977778888"] },
          ],
        }),
      });

      const res = await handleIngestRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toContain("Lead já processado anteriormente");
      expect(json.leadId).toBe("existing-lead-001");
    });
  });
});
