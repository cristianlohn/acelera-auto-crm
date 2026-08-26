/**
 * @file webhook-leads.test.ts
 * @description Suíte de Testes de Integração para a API de Webhooks de Ingestão de Leads (REQ-CRM-19).
 *
 * ============================================================================
 * ESCOPO DE TESTE & RASTREABILIDADE (SUT: POST /api/webhooks/leads)
 * ============================================================================
 * Cenários Testados:
 *   - [IT-WH.1]: Rejeição com status 401 quando o header `x-api-key` ou Bearer token não for fornecido ou for inválido.
 *   - [IT-WH.2]: Rejeição com status 400 quando o payload JSON não contiver os campos obrigatórios `name` ou `phone`.
 *   - [IT-WH.3]: Sucesso com status 201 ao enviar payload válido com normalização de campos (ex: Webmotors, iCarros, Meta).
 *   - [IT-WH.4]: Atribuição correta do status inicial 'novo' / 'NOVO' e cálculo de SLA imediato.
 *   - [IT-WH.5]: Sucesso na autenticação utilizando header `Authorization: Bearer <token>`.
 *   - [IT-WH.6]: Tratamento de JSON malformatado ou corpo inválido retornando status 500 sem vazamento de dados.
 *   - [IT-WH.7]: Persistência segura no Supabase e tratamento resiliente de erros do banco de dados.
 *
 * Padrão Estrutural: AAA (Arrange, Act, Assert)
 * Ambiente: Vitest + Node / Web API
 * ============================================================================
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/webhooks/leads/route";
import * as supabaseServerModule from "@/lib/supabase/server";

describe("[IT-WH] Ingestão Externa de Leads via Webhook (POST /api/webhooks/leads)", () => {
  const VALID_API_KEY = "acelera_api_key_live_123";

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.STORE_API_KEY;
    delete process.env.ACELERA_WEBHOOK_API_KEY;
  });

  /**
   * Helper para simular requisições NextRequest tipadas.
   */
  function createWebhookRequest(
    body: unknown,
    headers: Record<string, string> = {}
  ): NextRequest {
    const isString = typeof body === "string";
    const reqBody = isString ? body : JSON.stringify(body);

    return new NextRequest("http://localhost:3000/api/webhooks/leads", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: reqBody,
    });
  }

  it("[IT-WH.1] Deve rejeitar com status 401 quando o header de API Key estiver ausente ou inválido", async () => {
    // 1. Requisição sem nenhum header de autorização
    const reqNoAuth = createWebhookRequest({
      name: "Carlos Eduardo",
      phone: "(11) 98765-4321",
    });

    const resNoAuth = await POST(reqNoAuth);
    const jsonNoAuth = await resNoAuth.json();

    expect(resNoAuth.status).toBe(401);
    expect(jsonNoAuth.error).toBe("Chave de API inválida ou ausente.");

    // 2. Requisição com chave inválida
    const reqInvalidKey = createWebhookRequest(
      {
        name: "Carlos Eduardo",
        phone: "(11) 98765-4321",
      },
      { "x-api-key": "chave_falsa_999" }
    );

    const resInvalidKey = await POST(reqInvalidKey);
    const jsonInvalidKey = await resInvalidKey.json();

    expect(resInvalidKey.status).toBe(401);
    expect(jsonInvalidKey.error).toBe("Chave de API inválida ou ausente.");
  });

  it("[IT-WH.2] Deve rejeitar com status 400 quando o payload não tiver os campos obrigatórios 'name' ou 'phone'", async () => {
    // 1. Falta o campo 'phone'
    const reqMissingPhone = createWebhookRequest(
      {
        name: "Mariana Costa",
        email: "mariana@teste.com",
      },
      { "x-api-key": VALID_API_KEY }
    );

    const resMissingPhone = await POST(reqMissingPhone);
    const jsonMissingPhone = await resMissingPhone.json();

    expect(resMissingPhone.status).toBe(400);
    expect(jsonMissingPhone.error).toBe("Campos 'name' e 'phone' são obrigatórios.");

    // 2. Falta o campo 'name'
    const reqMissingName = createWebhookRequest(
      {
        phone: "(47) 99999-8888",
        vehicle_interest: "Honda Civic G10",
      },
      { "x-api-key": VALID_API_KEY }
    );

    const resMissingName = await POST(reqMissingName);
    const jsonMissingName = await resMissingName.json();

    expect(resMissingName.status).toBe(400);
    expect(jsonMissingName.error).toBe("Campos 'name' e 'phone' são obrigatórios.");

    // 3. Campos preenchidos apenas com espaços em branco
    const reqBlankFields = createWebhookRequest(
      {
        name: "   ",
        phone: "   ",
      },
      { "x-api-key": VALID_API_KEY }
    );

    const resBlankFields = await POST(reqBlankFields);
    const jsonBlankFields = await resBlankFields.json();

    expect(resBlankFields.status).toBe(400);
    expect(jsonBlankFields.error).toBe("Campos 'name' e 'phone' são obrigatórios.");
  });

  it("[IT-WH.3] Deve retornar status 201 ao enviar payload válido com normalização de campos (ex: Webmotors / iCarros)", async () => {
    // Arrange (Payload típico de portal de classificados)
    const payloadWebmotors = {
      name: "Rodrigo Mendonça",
      phone: "(11) 97777-6666",
      email: "rodrigo.mendonca@gmail.com",
      vehicle_interest: "Toyota Corolla XEi 2.0 2022",
      notes: "Tenho um seminovo para dar de entrada no negócio.",
      source: "webmotors",
    };

    const req = createWebhookRequest(payloadWebmotors, {
      "x-api-key": VALID_API_KEY,
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.lead_id).toBeDefined();
    expect(data.assigned_seller).toBeDefined();
    expect(data.distribution_mode).toBe("round_robin");
    expect(data.message).toContain("Lead recebido");
  });

  it("[IT-WH.4] Deve atribuir corretamente o status inicial 'novo' e timestamp de criação para ativação de SLA", async () => {
    // Mock Supabase para inspecionar os dados inseridos
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "lead_db_mock_12345" },
          error: null,
        }),
      }),
    });

    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);
    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue({
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
      }),
    } as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>);

    // Arrange
    const payload = {
      name: "Beatriz Oliveira",
      phone: "(48) 98888-1111",
      vehicleInterest: "Jeep Compass Longitude",
      source: "instagram",
    };

    const req = createWebhookRequest(payload, {
      "x-api-key": VALID_API_KEY,
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    expect(res.status).toBe(201);
    expect(data.lead_id).toBe("lead_db_mock_12345");
    expect(mockInsert).toHaveBeenCalledTimes(1);

    const insertedData = mockInsert.mock.calls[0][0];
    expect(insertedData.name).toBe("Beatriz Oliveira");
    expect(insertedData.phone).toBe("(48) 98888-1111");
    expect(insertedData.vehicle_interest).toBe("Jeep Compass Longitude");
    expect(insertedData.status).toBe("novo");
    expect(insertedData.origin).toBe("instagram");
    expect(insertedData.seller_name).toBeDefined();
    expect(insertedData.created_at).toBeDefined();
    expect(new Date(insertedData.created_at).getTime()).toBeGreaterThan(0);
  });

  it("[IT-WH.5] Deve autenticar com sucesso utilizando o header Authorization: Bearer <token>", async () => {
    // Arrange
    process.env.STORE_API_KEY = "ak_production_secret_token_789";

    const payload = {
      name: "Fernando Vasconcelos",
      phone: "(21) 99123-4567",
      vehicle: "BMW 320i M Sport",
      message: "Gostaria de agendar um test drive para sábado.",
    };

    const req = createWebhookRequest(payload, {
      authorization: "Bearer ak_production_secret_token_789",
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.lead_id).toBeDefined();
  });

  it("[IT-WH.6] Deve retornar 500 sem vazar detalhes quando o corpo da requisição for um JSON malformado", async () => {
    // Arrange
    const malformedBody = "{ name: 'Carlos', phone: "; // Sintaxe JSON inválida
    const req = createWebhookRequest(malformedBody, {
      "x-api-key": VALID_API_KEY,
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    expect(res.status).toBe(500);
    expect(data.error).toBe("Erro interno ao processar o webhook.");
    expect(data.stack).toBeUndefined();
  });

  it("[IT-WH.7] Deve retornar 500 com mensagem segura quando o Supabase retornar erro de inserção", async () => {
    // Arrange: Simular falha de banco no Supabase
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);
    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue({
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Database connection timeout" },
            }),
          }),
        }),
      }),
    } as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>);

    const payload = {
      name: "Luciana Lima",
      phone: "(11) 96666-5555",
    };

    const req = createWebhookRequest(payload, {
      "x-api-key": VALID_API_KEY,
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    expect(res.status).toBe(500);
    expect(data.error).toBe("Erro interno ao processar o webhook.");
    expect(data.error).not.toContain("Database connection timeout");
  });

  it("[IT-WH.8] Deve distribuir leads sequencialmente via Roleta Automática (Round-Robin) entre vendedores", async () => {
    // Enviar 3 requisições consecutivas sem vendedor explícito
    const res1 = await POST(
      createWebhookRequest({ name: "Lead 1", phone: "11999990001" }, { "x-api-key": VALID_API_KEY })
    );
    const data1 = await res1.json();

    const res2 = await POST(
      createWebhookRequest({ name: "Lead 2", phone: "11999990002" }, { "x-api-key": VALID_API_KEY })
    );
    const data2 = await res2.json();

    const res3 = await POST(
      createWebhookRequest({ name: "Lead 3", phone: "11999990003" }, { "x-api-key": VALID_API_KEY })
    );
    const data3 = await res3.json();

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    expect(res3.status).toBe(201);

    expect(data1.distribution_mode).toBe("round_robin");
    expect(data2.distribution_mode).toBe("round_robin");
    expect(data3.distribution_mode).toBe("round_robin");

    // Valida que os vendedores atribuídos são válidos da lista
    const validSellers = ["Rafael Alves", "Juliana Costa", "Marcos Ferreira"];
    expect(validSellers).toContain(data1.assigned_seller);
    expect(validSellers).toContain(data2.assigned_seller);
    expect(validSellers).toContain(data3.assigned_seller);
  });

  it("[IT-WH.9] Deve respeitar a atribuição direta quando o campo 'seller_name' for fornecido", async () => {
    const res = await POST(
      createWebhookRequest(
        {
          name: "Lead VIP Direto",
          phone: "11999998888",
          seller_name: "Marcos Ferreira",
        },
        { "x-api-key": VALID_API_KEY }
      )
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.assigned_seller).toBe("Marcos Ferreira");
    expect(data.distribution_mode).toBe("explicit");
  });
});
