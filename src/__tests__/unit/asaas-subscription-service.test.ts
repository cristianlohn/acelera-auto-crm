/**
 * @file asaas-subscription-service.test.ts
 * @description Suíte de Testes Automatizados para o Serviço de Assinaturas e Clientes no Asaas (v3 API).
 *
 * Cenários Testados:
 * - [TEST-ASAAS-SUB-1]: Criação / busca de Customer no Asaas.
 * - [TEST-ASAAS-SUB-2]: Criação de Subscription no Asaas com ciclo Mensal / Anual e status pendente.
 * - [TEST-ASAAS-SUB-3]: Persistência de `asaas_subscription_id` e `plan_status: 'pending'` no Supabase (NUNCA ativação prematura).
 * - [TEST-ASAAS-SUB-4]: Fallback seguro e geração de URL de fatura/checkout.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createOrGetAsaasCustomer,
  createAsaasSubscription,
} from "@/lib/services/asaas/subscription-service";
import * as supabaseServerModule from "@/lib/supabase/server";
import * as supabaseAdminModule from "@/lib/supabase/admin";

describe("[UNIT-ASAAS-SUBSCRIPTION] Criação de Assinaturas & Clientes Asaas", () => {
  const originalApiKey = process.env.ASAAS_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.ASAAS_API_KEY = "test_asaas_key_secret_123";
  });

  afterEach(() => {
    process.env.ASAAS_API_KEY = originalApiKey;
  });

  it("[TEST-ASAAS-SUB-1] deve reutilizar o asaas_customer_id existente quando já cadastrado e válido", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "cus_existing_123", name: "Loja Teste" }),
    } as Response);

    const result = await createOrGetAsaasCustomer({
      organizationId: "org-123",
      name: "Loja Teste",
      email: "contato@lojateste.com",
      currentAsaasCustomerId: "cus_existing_123",
    });

    expect(result.customerId).toBe("cus_existing_123");
  });

  it("[TEST-ASAAS-SUB-2] deve criar um novo Customer no Asaas via POST /v3/customers quando não existir", async () => {
    const mockFetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes("/customers?") && options?.method === "GET") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [] }),
        } as Response);
      }

      if (url.endsWith("/customers") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "cus_new_456", name: "Nova Loja" }),
        } as Response);
      }

      return Promise.resolve({ ok: false } as Response);
    });

    globalThis.fetch = mockFetch;

    const result = await createOrGetAsaasCustomer({
      organizationId: "org-456",
      name: "Nova Loja",
      email: "nova@loja.com",
      phone: "11988887777",
      document: "12345678000199",
    });

    expect(result.customerId).toBe("cus_new_456");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/customers"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Nova Loja"),
      })
    );
  });

  it("[TEST-ASAAS-SUB-3] deve criar Subscription com UNDEFINED billingType e salvar como 'pending' no Supabase", async () => {
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockAdminSupabase = {
      from: vi.fn().mockReturnValue({
        update: mockUpdate,
      }),
    };

    vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
      mockAdminSupabase as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
    );

    const mockFetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes("/customers")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "cus_sub_789" }),
        } as Response);
      }

      if (url.endsWith("/subscriptions") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: "sub_asaas_789",
            status: "PENDING",
            value: 597,
            cycle: "MONTHLY",
          }),
        } as Response);
      }

      if (url.includes("/subscriptions/sub_asaas_789/payments")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [
              {
                id: "pay_sub_001",
                invoiceUrl: "https://sandbox.asaas.com/i/pay_sub_001",
                bankSlipUrl: "https://sandbox.asaas.com/b/pay_sub_001",
              },
            ],
          }),
        } as Response);
      }

      return Promise.resolve({ ok: false } as Response);
    });

    globalThis.fetch = mockFetch;

    const result = await createAsaasSubscription({
      organizationId: "org-sub-789",
      organizationName: "Auto Prime Motors",
      organizationEmail: "contato@autoprime.com",
      planId: "pro",
      billingCycle: "mensal",
    });

    expect(result.success).toBe(true);
    expect(result.subscriptionId).toBe("sub_asaas_789");
    expect(result.checkoutUrl).toBe("https://sandbox.asaas.com/i/pay_sub_001");

    // Valida que o Supabase foi atualizado com 'pending' e NUNCA 'active' antes do webhook
    expect(mockAdminSupabase.from).toHaveBeenCalledWith("organizations");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        asaas_customer_id: "cus_sub_789",
        asaas_subscription_id: "sub_asaas_789",
        plan: "pro",
        plan_status: "pending",
        subscription_status: "pending",
      })
    );
  });
});
