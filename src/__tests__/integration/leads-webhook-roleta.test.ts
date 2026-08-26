/**
 * @file leads-webhook-roleta.test.ts
 * @description Suíte de Testes de Integração e Robustez para a Roleta de Leads (POST /api/webhooks/leads).
 *
 * Cenários Testados:
 * - [IT-ROULETTE.1]: Ingestão Unitária com status inicial 'novo', SLA de 15 min e associação de vendedor.
 * - [IT-ROULETTE.2]: Equidade da Roleta (9 leads distribuídos perfeitamente entre 3 vendedores).
 * - [IT-ROULETTE.3]: Concorrência em Larga Escala (20 requisições simultâneas via Promise.all sem race condition).
 * - [IT-ROULETTE.4]: Bypass da Roleta quando `assigned_to` ou `seller_name` for fornecido no payload.
 * - [IT-ROULETTE.5]: Fallback seguro para gestor (ADMIN) quando a organização não possuir vendedores ativos.
 * - [IT-ROULETTE.6]: Rejeição HTTP 401 Unauthorized para chave de API inválida ou ausente.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, resetRoundRobinCursor } from "@/app/api/webhooks/leads/route";
import * as supabaseServerModule from "@/lib/supabase/server";

describe("[IT-ROULETTE] Roleta de Leads e Robustez (POST /api/webhooks/leads)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetRoundRobinCursor(0);
  });

  function createWebhookRequest(
    body: Record<string, unknown>,
    headers: Record<string, string> = { "x-api-key": "acelera_api_key_live_123" }
  ): NextRequest {
    return new NextRequest("https://aceleraautocrm.com.br/api/webhooks/leads", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  }

  it("[IT-ROULETTE.1] Ingestão Unitária: cria lead com status 'novo', SLA de 15 min e vendedor atribuído", async () => {
    // Arrange
    const req = createWebhookRequest({
      name: "Guilherme Santos",
      phone: "11988887777",
      email: "guilherme@gmail.com",
      vehicle_interest: "Toyota Corolla Cross 2023",
      source: "webmotors",
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.status).toBe("novo");
    expect(data.sla_minutes).toBe(15);
    expect(data.assigned_seller).toBe("Rafael Alves");
    expect(data.distribution_mode).toBe("round_robin");
    expect(data.lead_id).toBeDefined();
  });

  it("[IT-ROULETTE.2] Equidade da Roleta: distribui 9 leads perfeitamente entre 3 vendedores (3 para cada)", async () => {
    // Arrange: 3 vendedores disponíveis (Rafael Alves, Juliana Costa, Marcos Ferreira)
    resetRoundRobinCursor(0);
    const sellerCounts: Record<string, number> = {
      "Rafael Alves": 0,
      "Juliana Costa": 0,
      "Marcos Ferreira": 0,
    };

    // Act: 9 envios sequenciais
    for (let i = 1; i <= 9; i++) {
      const req = createWebhookRequest({
        name: `Cliente Lead ${i}`,
        phone: `1199999000${i}`,
        vehicle: "Honda Civic 2022",
        source: "icarros",
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      const seller = data.assigned_seller as string;
      expect(sellerCounts[seller]).toBeDefined();
      sellerCounts[seller] += 1;
    }

    // Assert: Cada um dos 3 vendedores recebeu exatamente 3 leads
    expect(sellerCounts["Rafael Alves"]).toBe(3);
    expect(sellerCounts["Juliana Costa"]).toBe(3);
    expect(sellerCounts["Marcos Ferreira"]).toBe(3);
  });

  it("[IT-ROULETTE.3] Concorrência em Larga Escala: processa 20 requisições simultâneas via Promise.all sem deadlock", async () => {
    // Arrange
    resetRoundRobinCursor(0);
    const totalRequests = 20;
    const requests = Array.from({ length: totalRequests }, (_, idx) =>
      createWebhookRequest({
        name: `Lead Concorrente ${idx + 1}`,
        phone: `1198765432${idx.toString().padStart(2, "0")}`,
        vehicle: "Jeep Compass 2024",
        origin: "instagram",
      })
    );

    // Act: Execução concorrente
    const responses = await Promise.all(requests.map((req) => POST(req)));
    const results = await Promise.all(responses.map((res) => res.json()));

    // Assert
    expect(responses).toHaveLength(totalRequests);
    responses.forEach((res) => {
      expect(res.status).toBe(201);
    });

    const leadIds = new Set(results.map((r) => r.lead_id));
    expect(leadIds.size).toBe(totalRequests); // Todos os leads possuem IDs únicos

    const assignedSellers = results.map((r) => r.assigned_seller);
    const rafaelCount = assignedSellers.filter((s) => s === "Rafael Alves").length;
    const julianaCount = assignedSellers.filter((s) => s === "Juliana Costa").length;
    const marcosCount = assignedSellers.filter((s) => s === "Marcos Ferreira").length;

    // 20 dividido por 3 = 7, 7, 6
    expect(rafaelCount + julianaCount + marcosCount).toBe(20);
    expect(Math.max(rafaelCount, julianaCount, marcosCount) - Math.min(rafaelCount, julianaCount, marcosCount)).toBeLessThanOrEqual(1);
  });

  it("[IT-ROULETTE.4] Bypass de Vendedor: respeita atribuição explícita quando 'assigned_to' ou 'seller_name' estiver no payload", async () => {
    // 1. Via assigned_to
    const req1 = createWebhookRequest({
      name: "Mariana Silva",
      phone: "11977778888",
      vehicle: "BMW 320i",
      assigned_to: "Consultor Executivo VIP",
    });

    const res1 = await POST(req1);
    const data1 = await res1.json();

    expect(res1.status).toBe(201);
    expect(data1.assigned_seller).toBe("Consultor Executivo VIP");
    expect(data1.distribution_mode).toBe("explicit");

    // 2. Via seller_name
    const req2 = createWebhookRequest({
      name: "Felipe Andrade",
      phone: "11966665555",
      vehicle: "Audi A3",
      seller_name: "Fernanda Especialista",
    });

    const res2 = await POST(req2);
    const data2 = await res2.json();

    expect(res2.status).toBe(201);
    expect(data2.assigned_seller).toBe("Fernanda Especialista");
    expect(data2.distribution_mode).toBe("explicit");
  });

  it("[IT-ROULETTE.5] Organização sem Vendedores: executa fallback seguro alocando para o gestor ('admin')", async () => {
    // Arrange: Mock do Supabase retornando lista vazia de vendedores e 1 admin
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn((field: string, roles: string[]) => {
                  if (roles.includes("vendedor")) {
                    return Promise.resolve({ data: [], error: null }); // Sem vendedores
                  }
                  if (roles.includes("admin") || roles.includes("gerente")) {
                    return Promise.resolve({
                      data: [{ full_name: "Carlos Diretor Geral", role: "admin" }],
                      error: null,
                    });
                  }
                  return Promise.resolve({ data: [], error: null });
                }),
              }),
            }),
          };
        }
        if (table === "leads") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "lead_admin_fallback_123" },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>
    );

    const req = createWebhookRequest({
      name: "Cliente Direto",
      phone: "11955554444",
      vehicle: "Porsche Macan",
    });

    // Act
    const res = await POST(req);
    const data = await res.json();

    // Assert
    expect(res.status).toBe(201);
    expect(data.assigned_seller).toBe("Carlos Diretor Geral");
  });

  it("[IT-ROULETTE.6] Tratamento de Chave Inválida: retorna HTTP 401 quando a API Key for inválida ou ausente", async () => {
    // 1. Chave ausente
    const reqNoKey = new NextRequest("https://aceleraautocrm.com.br/api/webhooks/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Teste", phone: "11988887777" }),
    });

    const resNoKey = await POST(reqNoKey);
    expect(resNoKey.status).toBe(401);
    const dataNoKey = await resNoKey.json();
    expect(dataNoKey.error).toContain("Chave de API");

    // 2. Chave inválida
    const reqInvalidKey = createWebhookRequest(
      { name: "Teste", phone: "11988887777" },
      { "x-api-key": "chave_invalida_nao_reconhecida" }
    );

    const resInvalidKey = await POST(reqInvalidKey);
    expect(resInvalidKey.status).toBe(401);
  });
});
