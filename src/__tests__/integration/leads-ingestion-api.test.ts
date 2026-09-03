/**
 * @file leads-ingestion-api.test.ts
 * @description Suíte de Testes de Integração para a API de Ingestão de Leads (POST /api/v1/leads).
 *
 * Cenários Testados:
 * 1. Autenticação por API Key (Header x-api-key e Authorization: Bearer).
 * 2. Validação de Payload com Zod e Normalização de Telefone (E.164 +55).
 * 3. Atribuição Automática via Roleta Comercial (Fair Round-Robin & Especialidades).
 * 4. Idempotência, Resposta 201 e Tratamento de Recontatos.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as handleLeadIngest } from "@/app/api/v1/leads/ingest/route";
import { POST as handleCanonicalLeads } from "@/app/api/v1/leads/route";
import * as apiKeyServiceModule from "@/lib/services/api-key-service";
import * as supabaseServerModule from "@/lib/supabase/server";
import { resetRouletteState, setMockRouletteSellers } from "@/lib/services/lead-roulette";

describe("[API-V1-LEADS] Ingestão Externa de Leads & Distribuição via Roleta", () => {
  const TEST_ORG_A_ID = "org-alfa-1111-1111-1111";
  const VALID_TEST_KEY = "ak_live_valid_test_key_123456";

  beforeEach(() => {
    vi.restoreAllMocks();
    resetRouletteState();
  });

  function createRequest(body: unknown, headers: Record<string, string> = {}) {
    return new NextRequest("http://localhost:3000/api/v1/leads", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  }

  describe("1. Autenticação por API Key", () => {
    it("[API-LEAD-01.1] Deve rejeitar com HTTP 401 quando o header de API Key estiver ausente", async () => {
      const req = createRequest({
        name: "Carlos Teste",
        phone: "11988887777",
      });

      const res = await handleLeadIngest(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain("Unauthorized");
    });

    it("[API-LEAD-01.2] Deve rejeitar com HTTP 401 quando a API Key informada for inválida ou revogada", async () => {
      vi.spyOn(apiKeyServiceModule, "validateApiKey").mockResolvedValue({
        valid: false,
        error: "Chave de API inválida ou revogada.",
      });

      const req = createRequest(
        { name: "Carlos Teste", phone: "11988887777" },
        { "x-api-key": "invalid_random_key" }
      );

      const res = await handleLeadIngest(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain("inválida");
    });

    it("[API-LEAD-01.3] Deve aceitar autenticação via Authorization: Bearer <token> e vincular à organização correta", async () => {
      vi.spyOn(apiKeyServiceModule, "validateApiKey").mockResolvedValue({
        valid: true,
        organizationId: TEST_ORG_A_ID,
      });

      const req = createRequest(
        {
          name: "Mariana Souza",
          phone: "11977778888",
          vehicle_of_interest: "Jeep Compass Longitude",
        },
        { Authorization: `Bearer ${VALID_TEST_KEY}` }
      );

      const res = await handleCanonicalLeads(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.lead_id).toBeDefined();
    });
  });

  describe("2. Validação de Payload & Normalização", () => {
    beforeEach(() => {
      vi.spyOn(apiKeyServiceModule, "validateApiKey").mockResolvedValue({
        valid: true,
        organizationId: TEST_ORG_A_ID,
      });
    });

    it("[API-LEAD-02.1] Deve rejeitar com HTTP 400 quando o nome do cliente for menor que 2 caracteres", async () => {
      const req = createRequest(
        { name: "A", phone: "11988887777" },
        { "x-api-key": VALID_TEST_KEY }
      );

      const res = await handleLeadIngest(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain("Bad Request");
      expect(json.details?.name).toBeDefined();
    });

    it("[API-LEAD-02.2] Deve rejeitar com HTTP 400 quando o telefone for ausente ou inválido", async () => {
      const req = createRequest(
        { name: "Roberto Silva", phone: "123" },
        { "x-api-key": VALID_TEST_KEY }
      );

      const res = await handleLeadIngest(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.details?.phone).toBeDefined();
    });

    it("[API-LEAD-02.3] Deve normalizar o telefone com DDI 55 e caracteres limpos", async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "lead_inserted_123" }, error: null }),
        }),
      });
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);
      vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({ data: [] }),
                  }),
                }),
              }),
            }),
          }),
          insert: mockInsert,
        }),
      } as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>);

      const req = createRequest(
        {
          name: "Juliana Andrade",
          phone: "(11) 98765-4321",
          vehicle_of_interest: "Toyota Corolla XEi",
        },
        { "x-api-key": VALID_TEST_KEY }
      );

      const res = await handleLeadIngest(req);
      expect(res.status).toBe(201);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: "+5511987654321",
          name: "Juliana Andrade",
        })
      );
    });
  });

  describe("3. Atribuição Automática via Roleta (Round-Robin & Especialidades)", () => {
    beforeEach(() => {
      vi.spyOn(apiKeyServiceModule, "validateApiKey").mockResolvedValue({
        valid: true,
        organizationId: TEST_ORG_A_ID,
      });
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(false);
    });

    it("[API-LEAD-03.1] Deve alternar leads entre vendedores ativos em ciclo completo (Round-Robin)", async () => {
      setMockRouletteSellers([
        {
          id: "seller-1",
          organization_id: TEST_ORG_A_ID,
          name: "Vendedor 1 (Rafael)",
          phone: "+5511988881111",
          role: "seller",
          segment: "all",
          in_roulette: true,
          status: "active",
          last_lead_assigned_at: null,
        },
        {
          id: "seller-2",
          organization_id: TEST_ORG_A_ID,
          name: "Vendedor 2 (Juliana)",
          phone: "+5511988882222",
          role: "seller",
          segment: "all",
          in_roulette: true,
          status: "active",
          last_lead_assigned_at: null,
        },
      ]);

      // Lead 1 -> Vendedor 1
      const req1 = createRequest(
        { name: "Cliente 1", phone: "11988880001" },
        { "x-api-key": VALID_TEST_KEY }
      );
      const res1 = await handleLeadIngest(req1);
      const json1 = await res1.json();
      expect(json1.assigned_to?.id).toBe("seller-1");

      // Lead 2 -> Vendedor 2
      const req2 = createRequest(
        { name: "Cliente 2", phone: "11988880002" },
        { "x-api-key": VALID_TEST_KEY }
      );
      const res2 = await handleLeadIngest(req2);
      const json2 = await res2.json();
      expect(json2.assigned_to?.id).toBe("seller-2");

      // Lead 3 -> Vendedor 1 (ciclo completo)
      const req3 = createRequest(
        { name: "Cliente 3", phone: "11988880003" },
        { "x-api-key": VALID_TEST_KEY }
      );
      const res3 = await handleLeadIngest(req3);
      const json3 = await res3.json();
      expect(json3.assigned_to?.id).toBe("seller-1");
    });

    it("[API-LEAD-03.2] Deve priorizar vendedor com especialidade compatível com o segmento (used_cars / seminovos)", async () => {
      setMockRouletteSellers([
        {
          id: "seller-new",
          organization_id: TEST_ORG_A_ID,
          name: "Especialista Zero KM",
          phone: "+5511988881111",
          role: "seller",
          segment: "new_cars",
          in_roulette: true,
          status: "active",
          last_lead_assigned_at: null,
        },
        {
          id: "seller-used",
          organization_id: TEST_ORG_A_ID,
          name: "Especialista Seminovos",
          phone: "+5511988882222",
          role: "seller",
          segment: "used_cars",
          in_roulette: true,
          status: "active",
          last_lead_assigned_at: null,
        },
      ]);

      const req = createRequest(
        {
          name: "Cliente Seminovo",
          phone: "11988883333",
          segment: "used_cars",
          vehicle_of_interest: "Honda Civic 2021",
        },
        { "x-api-key": VALID_TEST_KEY }
      );

      const res = await handleLeadIngest(req);
      const json = await res.json();

      expect(json.assigned_to?.id).toBe("seller-used");
      expect(json.assigned_to?.name).toBe("Especialista Seminovos");
    });
  });

  describe("4. Resposta e Idempotência / Recontatos", () => {
    beforeEach(() => {
      vi.spyOn(apiKeyServiceModule, "validateApiKey").mockResolvedValue({
        valid: true,
        organizationId: TEST_ORG_A_ID,
      });
      setMockRouletteSellers([
        {
          id: "seller-1",
          organization_id: TEST_ORG_A_ID,
          name: "Vendedor Teste",
          phone: "+5511988881111",
          role: "seller",
          segment: "all",
          in_roulette: true,
          status: "active",
          last_lead_assigned_at: null,
        },
      ]);
    });

    it("[API-LEAD-04.1] Deve retornar HTTP 201 Created com payload completo e WhatsApp Direct URL", async () => {
      const req = createRequest(
        {
          name: "Lucas Alcantara",
          phone: "11988884444",
          vehicle_of_interest: "Ford Ranger XLS",
          source: "webmotors",
        },
        { "x-api-key": VALID_TEST_KEY }
      );

      const res = await handleLeadIngest(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.lead_id).toBeDefined();
      expect(json.assigned_to).toBeDefined();
      expect(json.whatsapp_direct_url).toContain("wa.me");
      expect(json.whatsapp_direct_url).toContain("Ford%20Ranger%20XLS");
    });

    it("[API-LEAD-04.2] Deve detectar recontato recente e atualizar o lead sem falha ou duplicação indevida", async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);
      vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: [
                        {
                          id: "lead_existing_999",
                          seller_id: "sp-001",
                          seller_name: "Rafael Alves",
                          notes: "Nota inicial do cliente",
                        },
                      ],
                    }),
                  }),
                }),
              }),
            }),
          }),
          update: mockUpdate,
        }),
      } as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>);

      const req = createRequest(
        {
          name: "Lucas Alcantara",
          phone: "11988884444",
          notes: "Gostaria de saber sobre taxas de financiamento.",
        },
        { "x-api-key": VALID_TEST_KEY }
      );

      const res = await handleLeadIngest(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.lead_id).toBe("lead_existing_999");
      expect(json.is_recontact).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: expect.stringContaining("[Recontato]"),
        })
      );
    });
  });
});
