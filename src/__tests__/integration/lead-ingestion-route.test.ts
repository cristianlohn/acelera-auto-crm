/**
 * @file lead-ingestion-route.test.ts
 * @description Suíte de testes de integração para o endpoint de Ingestão Externa de Leads (POST /api/v1/leads/ingest).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/v1/leads/ingest/route";
import { resetRouletteState, setMockRouletteSellers, DEFAULT_DEMO_ORG_ID } from "@/lib/services/lead-roulette";
import * as supabaseServerModule from "@/lib/supabase/server";

describe("[IT-LEAD-INGEST] Endpoint de Ingestão Externa de Leads (POST /api/v1/leads/ingest)", () => {
  const VALID_API_KEY = "acelera_api_key_live_123";

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.STORE_API_KEY;
    delete process.env.ACELERA_WEBHOOK_API_KEY;
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(false);
    resetRouletteState();
  });

  /**
   * Helper para simular requisições HTTP para a rota de ingestão.
   */
  function createIngestRequest(
    body: unknown,
    headers: Record<string, string> = {}
  ): NextRequest {
    const isString = typeof body === "string";
    const reqBody = isString ? body : JSON.stringify(body);

    return new NextRequest("http://localhost:3000/api/v1/leads/ingest", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: reqBody,
    });
  }

  it("[IT-INGEST-01] Deve rejeitar com status 401 quando o header de API Key estiver ausente ou inválido", async () => {
    // 1. Requisição sem nenhum header de autorização
    const reqNoAuth = createIngestRequest({
      name: "Carlos Eduardo",
      phone: "(11) 98765-4321",
    });

    const resNoAuth = await POST(reqNoAuth);
    expect(resNoAuth.status).toBe(401);
    const jsonNoAuth = await resNoAuth.json();
    expect(jsonNoAuth.success).toBe(false);
    expect(jsonNoAuth.error).toContain("Unauthorized");

    // 2. Requisição com chave inválida
    const reqInvalidAuth = createIngestRequest(
      {
        name: "Carlos Eduardo",
        phone: "(11) 98765-4321",
      },
      { "x-api-key": "chave_invalida_nao_cadastrada" }
    );

    const resInvalidAuth = await POST(reqInvalidAuth);
    expect(resInvalidAuth.status).toBe(401);
    const jsonInvalidAuth = await resInvalidAuth.json();
    expect(jsonInvalidAuth.success).toBe(false);
  });

  it("[IT-INGEST-02] Deve autenticar com sucesso utilizando header Authorization: Bearer <token>", async () => {
    const reqBearer = createIngestRequest(
      {
        name: "Mariana Souza",
        phone: "(11) 98888-7777",
        vehicle_of_interest: "Toyota Corolla Cross 2024",
      },
      { Authorization: `Bearer ${VALID_API_KEY}` }
    );

    const resBearer = await POST(reqBearer);
    expect(resBearer.status).toBe(201);
    const jsonBearer = await resBearer.json();
    expect(jsonBearer.success).toBe(true);
    expect(jsonBearer.lead_id).toBeDefined();
  });

  it("[IT-INGEST-03] Deve rejeitar com status 400 quando o payload contiver nome ou telefone inválido", async () => {
    // Nome com menos de 2 caracteres
    const reqInvalidName = createIngestRequest(
      {
        name: "A",
        phone: "(11) 98765-4321",
      },
      { "x-api-key": VALID_API_KEY }
    );

    const resInvalidName = await POST(reqInvalidName);
    expect(resInvalidName.status).toBe(400);
    const jsonInvalidName = await resInvalidName.json();
    expect(jsonInvalidName.success).toBe(false);
    expect(jsonInvalidName.details.name).toBeDefined();

    // Telefone com formato inválido (menos de 10 dígitos)
    const reqInvalidPhone = createIngestRequest(
      {
        name: "Carlos Silva",
        phone: "12345",
      },
      { "x-api-key": VALID_API_KEY }
    );

    const resInvalidPhone = await POST(reqInvalidPhone);
    expect(resInvalidPhone.status).toBe(400);
    const jsonInvalidPhone = await resInvalidPhone.json();
    expect(jsonInvalidPhone.success).toBe(false);
    expect(jsonInvalidPhone.details.phone).toBeDefined();
  });

  it("[IT-INGEST-04] Deve rejeitar com status 400 quando o corpo JSON estiver malformatado", async () => {
    const reqBadJson = createIngestRequest("CORPO_NAO_JSON_{{invalid", {
      "x-api-key": VALID_API_KEY,
    });

    const resBadJson = await POST(reqBadJson);
    expect(resBadJson.status).toBe(400);
    const jsonBad = await resBadJson.json();
    expect(jsonBad.success).toBe(false);
    expect(jsonBad.error).toContain("malformatado");
  });

  it("[IT-INGEST-05] Deve processar lead com sucesso, designar vendedor na roleta e gerar deep link de WhatsApp", async () => {
    const payload = {
      name: "Rodrigo Mendonça",
      phone: "(11) 99876-5432",
      email: "rodrigo.mendonca@gmail.com",
      source: "meta_ads" as const,
      segment: "new_cars" as const,
      vehicle_of_interest: "Jeep Compass Longitude 2024",
      notes: "Cliente tem interesse em financiar com 30% de entrada.",
      utm_source: "instagram",
      utm_medium: "stories",
      utm_campaign: "feirao_compass",
    };

    const req = createIngestRequest(payload, {
      "x-api-key": VALID_API_KEY,
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();

    // Validações da resposta padronizada
    expect(body.success).toBe(true);
    expect(body.lead_id).toMatch(/^lead_ingest_/);
    expect(body.assigned_to).toBeDefined();
    expect(body.assigned_to.id).toBeDefined();
    expect(body.assigned_to.name).toBeDefined();
    expect(body.assigned_to.phone).toBeDefined();

    // Validação da URL direta de WhatsApp
    expect(body.whatsapp_direct_url).toContain("https://wa.me/");
    expect(body.whatsapp_direct_url).toContain(encodeURIComponent("Rodrigo Mendonça"));
    expect(body.whatsapp_direct_url).toContain(encodeURIComponent("Jeep Compass Longitude 2024"));
  });

  it("[IT-INGEST-06] Deve respeitar vendedor atribuído via Roleta para leads de seminovos (used_cars)", async () => {
    setMockRouletteSellers([
      {
        id: "seller-used-specialist",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Especialista Usados",
        phone: "+5511999991111",
        role: "seller",
        segment: "used_cars",
        in_roulette: true,
        status: "active",
      },
    ]);

    const req = createIngestRequest(
      {
        name: "Fernando Ribeiro",
        phone: "(11) 97777-6666",
        segment: "used_cars",
        vehicle_of_interest: "Honda Civic 2020",
      },
      { "x-api-key": VALID_API_KEY }
    );

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.assigned_to?.name).toBe("Especialista Usados");
  });
});
