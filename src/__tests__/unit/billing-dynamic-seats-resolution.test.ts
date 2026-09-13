/**
 * @file billing-dynamic-seats-resolution.test.ts
 * @description Suíte de Testes Unitários para a Resolução Dinâmica de Planos e Assentos Extras do Asaas (Fase 2).
 *
 * Cenários Obrigatórios:
 * - Starter base (297) -> Starter, 0 extras.
 * - Starter + 1 extra (346) -> Starter, 1 extra.
 * - Starter + 2 extras (395) -> Starter, 2 extras.
 * - Pro base (497) -> Pro, 0 extras.
 * - Pro + 1 extra (546) -> Pro, 1 extra.
 * - Pro + 7 extras (840) -> Pro, 7 extras (NÃO deve ser Enterprise!).
 * - Pro anual (4970) -> Pro, anual, 0 extras.
 * - Fatura avulsa com externalReference 'plan:pro|extras:3' -> Pro, 3 extras.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolvePlanFromData } from "@/lib/billing/plan-resolution";
import * as tenantModule from "@/lib/auth/tenant";

describe("[UNIT-DYNAMIC-BILLING-RESOLUTION] Resolução de Planos e Assentos Extras", () => {
  it("Starter base (R$ 297,00) -> Starter, 0 extras", () => {
    const res = resolvePlanFromData({ value: 297 });
    expect(res.plan).toBe("starter");
    expect(res.extraSellersCount).toBe(0);
    expect(res.cycle).toBe("MONTHLY");
  });

  it("Starter + 1 extra (R$ 346,00) -> Starter, 1 extra", () => {
    const res = resolvePlanFromData({ value: 346 });
    expect(res.plan).toBe("starter");
    expect(res.extraSellersCount).toBe(1);
    expect(res.cycle).toBe("MONTHLY");
  });

  it("Starter + 2 extras (R$ 395,00) -> Starter, 2 extras", () => {
    const res = resolvePlanFromData({ value: 395 });
    expect(res.plan).toBe("starter");
    expect(res.extraSellersCount).toBe(2);
    expect(res.cycle).toBe("MONTHLY");
  });

  it("Pro base (R$ 497,00) -> Pro, 0 extras", () => {
    const res = resolvePlanFromData({ value: 497 });
    expect(res.plan).toBe("pro");
    expect(res.extraSellersCount).toBe(0);
    expect(res.cycle).toBe("MONTHLY");
  });

  it("Pro + 1 extra (R$ 546,00) -> Pro, 1 extra", () => {
    const res = resolvePlanFromData({ value: 546 });
    expect(res.plan).toBe("pro");
    expect(res.extraSellersCount).toBe(1);
    expect(res.cycle).toBe("MONTHLY");
  });

  it("Pro + 7 extras (R$ 840,00) -> Pro, 7 extras (NÃO deve ser Enterprise!)", () => {
    const res = resolvePlanFromData({ value: 840 });
    expect(res.plan).toBe("pro");
    expect(res.plan).not.toBe("enterprise");
    expect(res.extraSellersCount).toBe(7);
    expect(res.cycle).toBe("MONTHLY");
  });

  it("Pro anual (R$ 4.970,00) -> Pro, anual, 0 extras", () => {
    const res = resolvePlanFromData({ value: 4970 });
    expect(res.plan).toBe("pro");
    expect(res.plan).not.toBe("enterprise");
    expect(res.extraSellersCount).toBe(0);
    expect(res.cycle).toBe("YEARLY");
  });

  it("Fatura avulsa com externalReference 'plan:pro|extras:3' -> Pro, 3 extras", () => {
    const res = resolvePlanFromData({ externalReference: "plan:pro|extras:3" });
    expect(res.plan).toBe("pro");
    expect(res.extraSellersCount).toBe(3);
  });

  it("JSON em externalReference com extras -> Pro, 2 extras", () => {
    const res = resolvePlanFromData({
      externalReference: JSON.stringify({ orgId: "org-123", plan: "pro", extras: 2 }),
    });
    expect(res.plan).toBe("pro");
    expect(res.extraSellersCount).toBe(2);
  });

  it("Starter anual (R$ 2.970,00) -> Starter, anual, 0 extras", () => {
    const res = resolvePlanFromData({ value: 2970 });
    expect(res.plan).toBe("starter");
    expect(res.extraSellersCount).toBe(0);
    expect(res.cycle).toBe("YEARLY");
  });

  it("Descrição textual com 'Pro + 2 vendedores extras' -> Pro, 2 extras", () => {
    const res = resolvePlanFromData({
      description: "Assinatura Acelera Auto Pro + 2 vendedores extras",
    });
    expect(res.plan).toBe("pro");
    expect(res.extraSellersCount).toBe(2);
  });
});

describe("[UNIT-DYNAMIC-BILLING-ACTION] Server Action adjustExtraSeatsRecurrenceAction", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("deve executar ajuste de assentos extras com sucesso e retornar contagem e valor", async () => {
    vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
      isDemo: true,
      userId: "demo-user",
      userEmail: "demo@test.com",
      organizationId: "demo-org",
      profile: {
        id: "p1",
        organization_id: "demo-org",
        full_name: "Admin",
        role: "admin",
        email: "admin@test.com",
        phone: null,
        avatar_url: null,
        created_at: "",
        updated_at: "",
      },
      organization: {
        id: "demo-org",
        name: "Demo Org",
        slug: "demo-org",
        plan: "pro",
        document: null,
        subscription_status: "active",
        trial_ends_at: null,
        current_period_end: null,
        max_sellers: 8,
        created_at: "",
        updated_at: "",
      },
      needsOnboarding: false,
    });

    const { adjustExtraSeatsRecurrenceAction } = await import("@/app/actions/billing-actions");
    const result = await adjustExtraSeatsRecurrenceAction({ extraSellersCount: 4 });
    expect(result.success).toBe(true);
    expect(result.extraSellersCount).toBe(4);
  });

  it("deve normalizar valores negativos para 0 assentos extras", async () => {
    vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
      isDemo: true,
      userId: "demo-user",
      userEmail: "demo@test.com",
      organizationId: "demo-org",
      profile: {
        id: "p1",
        organization_id: "demo-org",
        full_name: "Admin",
        role: "admin",
        email: "admin@test.com",
        phone: null,
        avatar_url: null,
        created_at: "",
        updated_at: "",
      },
      organization: {
        id: "demo-org",
        name: "Demo Org",
        slug: "demo-org",
        plan: "pro",
        document: null,
        subscription_status: "active",
        trial_ends_at: null,
        current_period_end: null,
        max_sellers: 8,
        created_at: "",
        updated_at: "",
      },
      needsOnboarding: false,
    });

    const { adjustExtraSeatsRecurrenceAction } = await import("@/app/actions/billing-actions");
    const result = await adjustExtraSeatsRecurrenceAction({ extraSellersCount: -2 });
    expect(result.success).toBe(true);
    expect(result.extraSellersCount).toBe(0);
  });
});


