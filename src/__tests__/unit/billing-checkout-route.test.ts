/**
 * @file billing-checkout-route.test.ts
 * @description Testes unitários para a rota POST /api/v1/billing/checkout.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as billingCheckoutHandler } from "@/app/api/v1/billing/checkout/route";
import * as billingActionsModule from "@/app/actions/billing-actions";

function createCheckoutRequest(body: unknown) {
  return new NextRequest(new URL("/api/v1/billing/checkout", "http://localhost:3000"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("[UNIT-BILLING-CHECKOUT] POST /api/v1/billing/checkout", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("deve rejeitar documento fiscal inválido com status 400", async () => {
    const req = createCheckoutRequest({
      plan: "pro",
      cycle: "MONTHLY",
      document: "11111111111", // CPF inválido
      documentType: "CPF",
    });

    const res = await billingCheckoutHandler(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain("inválido");
  });

  it("deve processar checkout com sucesso e retornar URLs e identificadores Asaas", async () => {
    vi.spyOn(billingActionsModule, "createSubscriptionCheckoutAction").mockResolvedValueOnce({
      success: true,
      checkoutUrl: "https://sandbox.asaas.com/i/pay_test_001",
      invoiceUrl: "https://sandbox.asaas.com/i/pay_test_001",
      subscriptionId: "sub_asaas_12345",
      customerId: "cus_asaas_98765",
      pixQrCode: "data:image/png;base64,mockqr",
      pixCopyPaste: "00020126580014br.gov.bcb.pix...",
    });

    const req = createCheckoutRequest({
      plan: "pro",
      cycle: "MONTHLY",
      billingName: "Concessionária Acelera Auto",
      billingEmail: "financeiro@acelera.com.br",
    });

    const res = await billingCheckoutHandler(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.plan).toBe("pro");
    expect(json.cycle).toBe("MONTHLY");
    expect(json.checkoutUrl).toBe("https://sandbox.asaas.com/i/pay_test_001");
    expect(json.subscriptionId).toBe("sub_asaas_12345");
    expect(json.customerId).toBe("cus_asaas_98765");
  });

  it("deve mapear plano Enterprise e ciclo anual corretamente", async () => {
    const spy = vi.spyOn(billingActionsModule, "createSubscriptionCheckoutAction").mockResolvedValueOnce({
      success: true,
      checkoutUrl: "https://sandbox.asaas.com/i/pay_ent_002",
      subscriptionId: "sub_ent_456",
      customerId: "cus_ent_789",
    });

    const req = createCheckoutRequest({
      plan: "enterprise",
      cycle: "YEARLY",
    });

    const res = await billingCheckoutHandler(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.plan).toBe("enterprise");
    expect(json.cycle).toBe("YEARLY");

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: "enterprise",
        billingCycle: "anual",
      })
    );
  });

  it("deve retornar 400 quando createSubscriptionCheckoutAction falhar", async () => {
    vi.spyOn(billingActionsModule, "createSubscriptionCheckoutAction").mockResolvedValueOnce({
      success: false,
      error: "Plano 'ultra' inválido.",
    });

    const req = createCheckoutRequest({
      plan: "ultra",
    });

    const res = await billingCheckoutHandler(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe("Plano 'ultra' inválido.");
  });
});
