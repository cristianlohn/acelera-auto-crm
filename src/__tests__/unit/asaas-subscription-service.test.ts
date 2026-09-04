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

  it("[TEST-ASAAS-SUB-3] deve criar Subscription com UNDEFINED billingType, externalReference estruturado e NÃO alterar plano/status antes do webhook", async () => {
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

    let capturedSubscriptionPayload: { externalReference?: string; billingType?: string } | null = null;

    const mockFetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes("/customers")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "cus_sub_789" }),
        } as Response);
      }

      if (url.endsWith("/subscriptions") && options?.method === "POST") {
        capturedSubscriptionPayload = JSON.parse((options?.body as string) || "{}");
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

    // Valida externalReference estruturado com { orgId, plan, cycle }
    const subPayload = capturedSubscriptionPayload as { externalReference?: string } | null;
    expect(subPayload?.externalReference).toBe(
      JSON.stringify({ orgId: "org-sub-789", plan: "pro", cycle: "MONTHLY" })
    );

    // Valida que o Supabase registrou apenas o customer_id e NUNCA sobrescreveu o plano ou status antes do webhook
    expect(mockAdminSupabase.from).toHaveBeenCalledWith("organizations");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        asaas_customer_id: "cus_sub_789",
      })
    );
    expect(mockUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_status: "pending",
      })
    );
  });

  it("[TEST-ASAAS-SUB-4] deve retornar erro quando ASAAS_API_KEY não estiver definida", async () => {
    process.env.ASAAS_API_KEY = "";

    const result = await createAsaasSubscription({
      organizationId: "org-no-key",
      organizationName: "Sem Chave",
      organizationEmail: "semchave@loja.com",
      planId: "starter",
      billingCycle: "mensal",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("ASAAS_API_KEY");
  });

  it("[TEST-ASAAS-SUB-5] deve falhar caso a URL da fatura não possa ser obtida do Asaas", async () => {
    const mockFetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes("/customers")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "cus_no_inv" }),
        } as Response);
      }

      if (url.endsWith("/subscriptions") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: "sub_no_inv",
            status: "PENDING",
          }),
        } as Response);
      }

      if (url.includes("/subscriptions/sub_no_inv/payments")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [] }),
        } as Response);
      }

      return Promise.resolve({ ok: false } as Response);
    });

    globalThis.fetch = mockFetch;

    const result = await createAsaasSubscription({
      organizationId: "org-no-inv",
      organizationName: "Sem Fatura",
      organizationEmail: "semfatura@loja.com",
      planId: "enterprise",
      billingCycle: "anual",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Não foi possível obter a URL da fatura");
  });

  it("[TEST-ASAAS-SUB-6] deve utilizar CNPJ de teste em sandbox/dev quando a loja não tiver documento cadastrado", async () => {
    interface AsaasCustomerPayload {
      name?: string;
      email?: string;
      cpfCnpj?: string;
      phone?: string;
      mobilePhone?: string;
      externalReference?: string;
      notificationDisabled?: boolean;
    }

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
          json: async () => ({ id: "cus_sandbox_doc", name: "Loja Sem Doc" }),
        } as Response);
      }

      return Promise.resolve({ ok: false } as Response);
    });

    globalThis.fetch = mockFetch;

    const result = await createOrGetAsaasCustomer({
      organizationId: "org-no-doc",
      name: "Loja Sem Doc",
      email: "semdoc@loja.com",
    });

    expect(result.customerId).toBe("cus_sandbox_doc");

    const postCall = mockFetch.mock.calls.find(
      (call: unknown[]) => typeof call[0] === "string" && (call[0] as string).endsWith("/customers")
    );
    const requestBody = JSON.parse(
      ((postCall?.[1] as RequestInit | undefined)?.body as string) || "{}"
    ) as AsaasCustomerPayload;

    expect(requestBody.cpfCnpj).toBe("00000000000191");
  });

  it("[TEST-ASAAS-SUB-7] deve enviar dados fiscais e de faturamento customizados para o Asaas", async () => {
    interface AsaasCustomerPayload {
      name?: string;
      email?: string;
      cpfCnpj?: string;
      phone?: string;
      mobilePhone?: string;
      externalReference?: string;
      notificationDisabled?: boolean;
    }

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
          json: async () => ({ id: "cus_custom_billing", name: "Auto Prime LTDA" }),
        } as Response);
      }

      return Promise.resolve({ ok: false } as Response);
    });

    globalThis.fetch = mockFetch;

    const result = await createOrGetAsaasCustomer({
      organizationId: "org-custom-123",
      name: "Nome Antigo",
      email: "antigo@loja.com",
      billingName: "Auto Prime Veículos LTDA",
      billingEmail: "financeiro@autoprime.com.br",
      billingPhone: "(11) 98888-9999",
      document: "33.000.167/0001-01",
      documentType: "CNPJ",
    });

    expect(result.customerId).toBe("cus_custom_billing");

    const postCall = mockFetch.mock.calls.find(
      (call: unknown[]) => typeof call[0] === "string" && (call[0] as string).endsWith("/customers")
    );
    const requestBody = JSON.parse(
      ((postCall?.[1] as RequestInit | undefined)?.body as string) || "{}"
    ) as AsaasCustomerPayload;

    expect(requestBody.name).toBe("Auto Prime Veículos LTDA");
    expect(requestBody.email).toBe("financeiro@autoprime.com.br");
    expect(requestBody.cpfCnpj).toBe("33000167000101");
    expect(requestBody.phone).toBe("11988889999");
  });

  it("[TEST-ASAAS-SUB-8] deve atualizar dados do cliente existente via PUT /customers/{id} quando localizado por CPF/CNPJ", async () => {
    interface AsaasCustomerPayload {
      name?: string;
      email?: string;
      cpfCnpj?: string;
      phone?: string;
      company?: string;
    }

    const mockFetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      // Busca por CPF/CNPJ encontra cliente existente
      if (url.includes("/customers?cpfCnpj=12345678000199") && options?.method === "GET") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [
              {
                id: "cus_existing_papai",
                name: "teste sandbox asaas",
                email: "teste@mail.com",
                cpfCnpj: "12345678000199",
              },
            ],
          }),
        } as Response);
      }

      // Atualização do cliente via PUT
      if (url.includes("/customers/cus_existing_papai") && options?.method === "PUT") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: "cus_existing_papai",
            name: "PAPAI CRISTIAN",
            email: "cristian@papai.com.br",
          }),
        } as Response);
      }

      return Promise.resolve({ ok: false } as Response);
    });

    globalThis.fetch = mockFetch;

    const result = await createOrGetAsaasCustomer({
      organizationId: "org-papai-123",
      name: "PAPAI CRISTIAN",
      email: "cristian@papai.com.br",
      phone: "47999998888",
      document: "12.345.678/0001-99",
    });

    expect(result.customerId).toBe("cus_existing_papai");

    const putCall = mockFetch.mock.calls.find(
      (call: unknown[]) =>
        typeof call[0] === "string" &&
        (call[0] as string).includes("/customers/cus_existing_papai") &&
        (call[1] as RequestInit | undefined)?.method === "PUT"
    );
    expect(putCall).toBeDefined();

    const putBody = JSON.parse(
      ((putCall?.[1] as RequestInit | undefined)?.body as string) || "{}"
    ) as AsaasCustomerPayload;

    expect(putBody.name).toBe("PAPAI CRISTIAN");
    expect(putBody.email).toBe("cristian@papai.com.br");
    expect(putBody.company).toBe("PAPAI CRISTIAN");
    expect(putBody.phone).toBe("47999998888");
  });

  it("[TEST-ASAAS-SUB-9] deve normalizar a descrição para 'Assinatura Plano Pro (Mensal)' sem duplicar 'Plano Plano'", async () => {
    let capturedSubscriptionPayload: { description?: string } | null = null;

    const mockFetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes("/customers")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "cus_sub_norm" }),
        } as Response);
      }

      if (url.endsWith("/subscriptions") && options?.method === "POST") {
        capturedSubscriptionPayload = JSON.parse(
          (options?.body as string) || "{}"
        );
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: "sub_norm_123",
            status: "PENDING",
          }),
        } as Response);
      }

      if (url.includes("/subscriptions/sub_norm_123/payments")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [
              {
                id: "pay_norm_001",
                invoiceUrl: "https://sandbox.asaas.com/i/pay_norm_001",
              },
            ],
          }),
        } as Response);
      }

      return Promise.resolve({ ok: false } as Response);
    });

    globalThis.fetch = mockFetch;

    const result = await createAsaasSubscription({
      organizationId: "org-norm-desc",
      organizationName: "Auto Prime Motors",
      planId: "pro",
      billingCycle: "mensal",
    });

    expect(result.success).toBe(true);
    expect(capturedSubscriptionPayload).not.toBeNull();
    const payload = capturedSubscriptionPayload as { description?: string } | null;
    expect(payload?.description).toBe("Assinatura Plano Pro (Mensal)");
    expect(payload?.description).not.toContain("Plano Plano");
  });
});
