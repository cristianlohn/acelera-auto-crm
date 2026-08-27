/**
 * @file lead-roulette-e2e.test.ts
 * @description Suíte de testes de integração ponta a ponta para a Roleta Comercial de Leads (/api/v1/leads/ingest).
 *
 * Cenários Validados:
 * - [CENÁRIO 1]: Distribuição Sequencial Round-Robin Justa (A -> B -> C -> A).
 * - [CENÁRIO 2]: Respeito ao Switch de Plantão (Pausa de vendedor in_roulette = false).
 * - [CENÁRIO 3]: Especialização de Segmento (Novos vs Seminovos vs F&I Fallback).
 * - [CENÁRIO 4]: Ausência de Vendedores em Plantão (Fallback seguro e graceful unassigned).
 * - [CENÁRIO 5]: Sanitização de Telefone Brasileiro e Geração de Deep Link de WhatsApp.
 * - [CENÁRIO 6]: Autenticação e Segurança (Rejeição imediata sem API Key válida).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/v1/leads/ingest/route";
import {
  resetRouletteState,
  setMockRouletteSellers,
  DEFAULT_DEMO_ORG_ID,
  type LeadRouletteMember,
} from "@/lib/services/lead-roulette";
import * as supabaseServerModule from "@/lib/supabase/server";

describe("[IT-ROULETTE-E2E] Suíte de Testes Ponta a Ponta da Roleta Comercial (/api/v1/leads/ingest)", () => {
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

  it("[CENÁRIO 1 - Distribuição Sequencial Round-Robin] Deve distribuir 4 leads sequencialmente entre 3 vendedores (A -> B -> C -> A)", async () => {
    const mockSellers: LeadRouletteMember[] = [
      {
        id: "seller-a",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Vendedor A",
        phone: "+5511911111111",
        role: "seller",
        segment: "all",
        in_roulette: true,
        status: "active",
        last_lead_assigned_at: null,
      },
      {
        id: "seller-b",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Vendedor B",
        phone: "+5511922222222",
        role: "seller",
        segment: "all",
        in_roulette: true,
        status: "active",
        last_lead_assigned_at: null,
      },
      {
        id: "seller-c",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Vendedor C",
        phone: "+5511933333333",
        role: "seller",
        segment: "all",
        in_roulette: true,
        status: "active",
        last_lead_assigned_at: null,
      },
    ];

    setMockRouletteSellers(mockSellers);

    // 1º Lead
    const res1 = await POST(
      createIngestRequest(
        { name: "Cliente 1", phone: "11988880001", segment: "all" },
        { "x-api-key": VALID_API_KEY }
      )
    );
    expect(res1.status).toBe(201);
    const body1 = await res1.json();
    expect(body1.assigned_to.name).toBe("Vendedor A");

    // 2º Lead
    const res2 = await POST(
      createIngestRequest(
        { name: "Cliente 2", phone: "11988880002", segment: "all" },
        { "x-api-key": VALID_API_KEY }
      )
    );
    expect(res2.status).toBe(201);
    const body2 = await res2.json();
    expect(body2.assigned_to.name).toBe("Vendedor B");

    // 3º Lead
    const res3 = await POST(
      createIngestRequest(
        { name: "Cliente 3", phone: "11988880003", segment: "all" },
        { "x-api-key": VALID_API_KEY }
      )
    );
    expect(res3.status).toBe(201);
    const body3 = await res3.json();
    expect(body3.assigned_to.name).toBe("Vendedor C");

    // 4º Lead -> Reinicia o ciclo no Vendedor A
    const res4 = await POST(
      createIngestRequest(
        { name: "Cliente 4", phone: "11988880004", segment: "all" },
        { "x-api-key": VALID_API_KEY }
      )
    );
    expect(res4.status).toBe(201);
    const body4 = await res4.json();
    expect(body4.assigned_to.name).toBe("Vendedor A");
  });

  it("[CENÁRIO 2 - Respeito ao Switch de Plantão (Pausa)] Deve ignorar Vendedor B pausado (in_roulette = false) e alternar apenas entre A e C", async () => {
    const mockSellers: LeadRouletteMember[] = [
      {
        id: "seller-a",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Vendedor A",
        phone: "+5511911111111",
        role: "seller",
        segment: "all",
        in_roulette: true,
        status: "active",
        last_lead_assigned_at: null,
      },
      {
        id: "seller-b",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Vendedor B (Pausado Almoço)",
        phone: "+5511922222222",
        role: "seller",
        segment: "all",
        in_roulette: false, // Switch desligado
        status: "active",
        last_lead_assigned_at: null,
      },
      {
        id: "seller-c",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Vendedor C",
        phone: "+5511933333333",
        role: "seller",
        segment: "all",
        in_roulette: true,
        status: "active",
        last_lead_assigned_at: null,
      },
    ];

    setMockRouletteSellers(mockSellers);

    // Lead 1 -> Atribuído ao Vendedor A
    const res1 = await POST(
      createIngestRequest(
        { name: "Lead Alpha", phone: "11999991111" },
        { "x-api-key": VALID_API_KEY }
      )
    );
    const body1 = await res1.json();
    expect(body1.assigned_to.name).toBe("Vendedor A");

    // Lead 2 -> Deve pular Vendedor B e ir direto para Vendedor C
    const res2 = await POST(
      createIngestRequest(
        { name: "Lead Beta", phone: "11999992222" },
        { "x-api-key": VALID_API_KEY }
      )
    );
    const body2 = await res2.json();
    expect(body2.assigned_to.name).toBe("Vendedor C");

    // Lead 3 -> Deve voltar para Vendedor A (Vendedor B nunca recebe)
    const res3 = await POST(
      createIngestRequest(
        { name: "Lead Gamma", phone: "11999993333" },
        { "x-api-key": VALID_API_KEY }
      )
    );
    const body3 = await res3.json();
    expect(body3.assigned_to.name).toBe("Vendedor A");
  });

  it("[CENÁRIO 3 - Especialização de Segmento (Novos vs Seminovos)] Deve direcionar leads por especialidade e aplicar fallback elegante", async () => {
    const mockSellers: LeadRouletteMember[] = [
      {
        id: "seller-new",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Vendedor A (0km)",
        phone: "+5511911111111",
        role: "seller",
        segment: "new_cars",
        in_roulette: true,
        status: "active",
        last_lead_assigned_at: null,
      },
      {
        id: "seller-used",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Vendedor B (Seminovos)",
        phone: "+5511922222222",
        role: "seller",
        segment: "used_cars",
        in_roulette: true,
        status: "active",
        last_lead_assigned_at: null,
      },
    ];

    setMockRouletteSellers(mockSellers);

    // 1. Lead de Usados -> Direcionado exclusivamente para Vendedor B
    const resUsed = await POST(
      createIngestRequest(
        {
          name: "Interessado Seminovos",
          phone: "11988883333",
          segment: "used_cars",
          vehicle_of_interest: "Toyota Yaris 2021",
        },
        { "x-api-key": VALID_API_KEY }
      )
    );
    const bodyUsed = await resUsed.json();
    expect(bodyUsed.assigned_to.name).toBe("Vendedor B (Seminovos)");

    // 2. Lead de F&I (sem especialista específico no pool) -> Fallback elegante para qualquer vendedor ativo
    const resFI = await POST(
      createIngestRequest(
        {
          name: "Interessado Financiamento",
          phone: "11988884444",
          segment: "f_and_i",
          vehicle_of_interest: "Consultoria Financiamento",
        },
        { "x-api-key": VALID_API_KEY }
      )
    );
    expect(resFI.status).toBe(201);
    const bodyFI = await resFI.json();
    expect(bodyFI.success).toBe(true);
    expect(bodyFI.assigned_to).toBeDefined();
    expect(["Vendedor A (0km)", "Vendedor B (Seminovos)"]).toContain(bodyFI.assigned_to.name);
  });

  it("[CENÁRIO 4 - Ausência de Vendedores em Plantão (Fallback Seguro)] Deve retornar 201 com assigned_to = null sem lançar erro", async () => {
    const mockSellers: LeadRouletteMember[] = [
      {
        id: "seller-all-off",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Vendedor Folga",
        phone: "+5511911111111",
        role: "seller",
        segment: "all",
        in_roulette: false,
        status: "paused",
        last_lead_assigned_at: null,
      },
    ];

    setMockRouletteSellers(mockSellers);

    const res = await POST(
      createIngestRequest(
        {
          name: "Lead Noturno Fora do Horário",
          phone: "11977778888",
          vehicle_of_interest: "Honda HR-V 2024",
        },
        { "x-api-key": VALID_API_KEY }
      )
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.assigned_to).toBeNull();
    expect(body.lead_id).toBeDefined();
    expect(body.whatsapp_direct_url).toContain("https://wa.me/5511977778888");
  });

  it("[CENÁRIO 5 - Sanitização de Telefone e Geração do Link WhatsApp] Deve sanitizar telefone com máscara (47) 99123-4567 e formatar URL do WhatsApp", async () => {
    setMockRouletteSellers([
      {
        id: "seller-target",
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: "Juliana Consultora",
        phone: "+5547988887777",
        role: "seller",
        segment: "all",
        in_roulette: true,
        status: "active",
        last_lead_assigned_at: null,
      },
    ]);

    const res = await POST(
      createIngestRequest(
        {
          name: "Roberto Campos",
          phone: "(47) 99123-4567",
          vehicle_of_interest: "BMW 320i M Sport 2023",
          source: "meta_ads",
        },
        { "x-api-key": VALID_API_KEY }
      )
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.assigned_to.name).toBe("Juliana Consultora");

    // Valida Deep Link de WhatsApp contendo o telefone do vendedor e a mensagem com o veículo
    expect(body.whatsapp_direct_url).toContain("https://wa.me/5547988887777");
    expect(body.whatsapp_direct_url).toContain(encodeURIComponent("Roberto Campos"));
    expect(body.whatsapp_direct_url).toContain(encodeURIComponent("BMW 320i M Sport 2023"));
  });

  it("[CENÁRIO 6 - Segurança e Autenticação] Deve rejeitar requisições sem header x-api-key ou com credenciais inválidas com HTTP 401", async () => {
    // 1. Sem credenciais
    const resNoKey = await POST(
      createIngestRequest({
        name: "Lead Inválido",
        phone: "11999990000",
      })
    );
    expect(resNoKey.status).toBe(401);
    const bodyNoKey = await resNoKey.json();
    expect(bodyNoKey.success).toBe(false);
    expect(bodyNoKey.error).toContain("Unauthorized");

    // 2. Com chave inválida
    const resBadKey = await POST(
      createIngestRequest(
        { name: "Lead Inválido", phone: "11999990000" },
        { "x-api-key": "token_falso_hacker_123" }
      )
    );
    expect(resBadKey.status).toBe(401);
    const bodyBadKey = await resBadKey.json();
    expect(bodyBadKey.success).toBe(false);
  });
});
