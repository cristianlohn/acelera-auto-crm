/**
 * @file subscription-checkout.test.ts
 * @description Testes unitários para validação de envio do parâmetro oficial `cycle` (MONTHLY | YEARLY)
 * nas assinaturas do Asaas e normalização de ciclo de faturamento.
 *
 * Cenários Testados:
 * - [TEST-CYCLE-1]: Submissão de plano anual envia estritamente cycle: 'YEARLY' para a API do Asaas.
 * - [TEST-CYCLE-2]: Submissão de plano mensal envia estritamente cycle: 'MONTHLY' para a API do Asaas.
 * - [TEST-CYCLE-3]: Normalização de variantes (annual, annually, anual) mapeia corretamente para 'YEARLY'.
 * - [TEST-CYCLE-4]: createSubscriptionCheckoutAction repassa cycle: 'YEARLY' ao processar plano anual.
 * - [TEST-CYCLE-5]: createSubscriptionCheckoutAction repassa cycle: 'MONTHLY' ao processar plano mensal.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAsaasSubscription } from "@/lib/services/asaas/subscription-service";
import { createSubscriptionCheckoutAction } from "@/app/actions/billing-actions";
import * as tenantModule from "@/lib/auth/tenant";
import * as asaasServiceModule from "@/lib/services/asaas/subscription-service";

interface SubPayload {
  cycle?: string;
  value?: number;
  [key: string]: unknown;
}

describe("[UNIT-SUBSCRIPTION-CHECKOUT] Validação do Parâmetro cycle no Asaas", () => {
  const originalApiKey = process.env.ASAAS_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.ASAAS_API_KEY = "test_asaas_key_valid";
  });

  afterEach(() => {
    process.env.ASAAS_API_KEY = originalApiKey;
  });

  it("[TEST-CYCLE-1] deve validar que a submissão de plano anual envia cycle: 'YEARLY' para a API Asaas", async () => {
    let capturedBody: SubPayload | null = null;

    const mockFetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes("/customers")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "cus_yearly_test_1" }),
        } as Response);
      }

      if (url.endsWith("/subscriptions") && options?.method === "POST") {
        capturedBody = JSON.parse(options.body as string);
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: "sub_yearly_001",
            paymentLink: "https://sandbox.asaas.com/i/sub_yearly_001",
          }),
        } as Response);
      }

      return Promise.resolve({ ok: false } as Response);
    });

    globalThis.fetch = mockFetch;

    const result = await createAsaasSubscription({
      organizationId: "org-yearly-test",
      organizationName: "Loja Anual",
      organizationEmail: "anual@loja.com",
      planId: "pro",
      billingCycle: "anual",
      cycle: "YEARLY",
    });

    expect(result.success).toBe(true);
    const payload = capturedBody as unknown as SubPayload;
    expect(payload).not.toBeNull();
    expect(payload.cycle).toBe("YEARLY");
    expect(payload.value).toBe(5970);
  });

  it("[TEST-CYCLE-2] deve validar que a submissão de plano mensal envia cycle: 'MONTHLY' para a API Asaas", async () => {
    let capturedBody: SubPayload | null = null;

    const mockFetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes("/customers")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "cus_monthly_test_1" }),
        } as Response);
      }

      if (url.endsWith("/subscriptions") && options?.method === "POST") {
        capturedBody = JSON.parse(options.body as string);
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: "sub_monthly_001",
            paymentLink: "https://sandbox.asaas.com/i/sub_monthly_001",
          }),
        } as Response);
      }

      return Promise.resolve({ ok: false } as Response);
    });

    globalThis.fetch = mockFetch;

    const result = await createAsaasSubscription({
      organizationId: "org-monthly-test",
      organizationName: "Loja Mensal",
      organizationEmail: "mensal@loja.com",
      planId: "pro",
      billingCycle: "mensal",
      cycle: "MONTHLY",
    });

    expect(result.success).toBe(true);
    const payload2 = capturedBody as unknown as SubPayload;
    expect(payload2).not.toBeNull();
    expect(payload2.cycle).toBe("MONTHLY");
    expect(payload2.value).toBe(597);
  });

  it("[TEST-CYCLE-3] normalização de variantes (annual, annually, anual) mapeia corretamente para 'YEARLY'", async () => {
    let capturedBody: SubPayload | null = null;

    const mockFetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes("/customers")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "cus_test" }),
        } as Response);
      }

      if (url.endsWith("/subscriptions") && options?.method === "POST") {
        capturedBody = JSON.parse(options.body as string);
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: "sub_test",
            paymentLink: "https://sandbox.asaas.com/i/sub_test",
          }),
        } as Response);
      }

      return Promise.resolve({ ok: false } as Response);
    });

    globalThis.fetch = mockFetch;

    await createAsaasSubscription({
      organizationId: "org-variant-test",
      planId: "starter",
      billingCycle: "anual",
      cycle: "annual",
    });

    const payload3 = capturedBody as unknown as SubPayload;
    expect(payload3.cycle).toBe("YEARLY");
    expect(payload3.value).toBe(2970);
  });

  it("[TEST-CYCLE-4] createSubscriptionCheckoutAction repassa cycle: 'YEARLY' ao processar plano anual", async () => {
    vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
      isDemo: false,
      userId: "admin-user",
      organizationId: "org-admin-1",
      profile: { role: "admin", id: "admin-user" } as NonNullable<tenantModule.TenantContextResult["profile"]>,
      organization: { id: "org-admin-1", name: "Concessionária Teste" } as NonNullable<tenantModule.TenantContextResult["organization"]>,
      needsOnboarding: false,
    });

    const createSpy = vi.spyOn(asaasServiceModule, "createAsaasSubscription").mockResolvedValue({
      success: true,
      checkoutUrl: "https://sandbox.asaas.com/i/sub_yearly_checkout",
      subscriptionId: "sub_123",
      customerId: "cus_123",
    });

    const result = await createSubscriptionCheckoutAction({
      planId: "pro",
      billingCycle: "anual",
      cycle: "YEARLY",
      name: "Loja Teste",
      email: "financeiro@loja.com",
      cpfCnpj: "00000000000191",
    });

    expect(result.success).toBe(true);
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        cycle: "YEARLY",
        billingCycle: "anual",
      })
    );
  });

  it("[TEST-CYCLE-5] createSubscriptionCheckoutAction repassa cycle: 'MONTHLY' ao processar plano mensal", async () => {
    vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
      isDemo: false,
      userId: "admin-user",
      organizationId: "org-admin-1",
      profile: { role: "admin", id: "admin-user" } as NonNullable<tenantModule.TenantContextResult["profile"]>,
      organization: { id: "org-admin-1", name: "Concessionária Teste" } as NonNullable<tenantModule.TenantContextResult["organization"]>,
      needsOnboarding: false,
    });

    const createSpy = vi.spyOn(asaasServiceModule, "createAsaasSubscription").mockResolvedValue({
      success: true,
      checkoutUrl: "https://sandbox.asaas.com/i/sub_monthly_checkout",
      subscriptionId: "sub_456",
      customerId: "cus_456",
    });

    const result = await createSubscriptionCheckoutAction({
      planId: "starter",
      billingCycle: "mensal",
      name: "Loja Mensal",
      email: "financeiro@loja.com",
      cpfCnpj: "00000000000191",
    });

    expect(result.success).toBe(true);
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        cycle: "MONTHLY",
        billingCycle: "mensal",
      })
    );
  });
});
