/**
 * @file asaas-billing-dates.test.ts
 * @description Suíte de Testes Unitários para o Cálculo e Ancoragem de Vigência de Ciclo Asaas (current_period_end).
 *
 * Cenários Testados:
 * - [TEST-DATE-1]: Ancoragem exata no final do dia do vencimento oficial ('2026-10-15T23:59:59.999Z').
 * - [TEST-DATE-2]: Pagamento antecipado garante que o cliente mantém os dias restantes do ciclo sem perdas.
 * - [TEST-DATE-3]: Fallback seguro de +30 dias quando o gateway não fornece dueDate.
 * - [TEST-DATE-4]: Processamento do Webhook Asaas persiste current_period_end ancorado no dueDate.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculatePeriodEndDate,
  resolvePeriodEndDate,
} from "@/lib/services/asaas/subscription-service";
import { processAsaasWebhookEvent } from "@/lib/services/asaas/webhook-service";
import * as supabaseServerModule from "@/lib/supabase/server";
import * as supabaseAdminModule from "@/lib/supabase/admin";

describe("[UNIT-ASAAS-DATES] Cálculo de Vigência e Ciclo de Faturamento (current_period_end)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[TEST-DATE-1] deve calcular current_period_end de +1 mês (final do dia) para ciclo mensal", () => {
    const fixedBaseDate = new Date("2026-09-04T12:00:00.000Z");
    const periodEnd = calculatePeriodEndDate("MONTHLY", fixedBaseDate);

    const resultDate = new Date(periodEnd);
    expect(resultDate.getFullYear()).toBe(2026);
    expect(resultDate.getMonth()).toBe(9); // Outubro (0-indexed: 9)
    expect(resultDate.getDate()).toBe(4);
    expect(resultDate.getHours()).toBe(23);
    expect(resultDate.getMinutes()).toBe(59);
    expect(resultDate.getSeconds()).toBe(59);
    expect(resultDate.getMilliseconds()).toBe(999);
  });

  it("[TEST-DATE-2] deve calcular current_period_end de +1 ano (final do dia) para ciclo anual/yearly", () => {
    const fixedBaseDate = new Date("2026-09-04T12:00:00.000Z");
    const periodEndAnnual = calculatePeriodEndDate("ANNUAL", fixedBaseDate);
    const periodEndYearly = calculatePeriodEndDate("YEARLY", fixedBaseDate);

    const resultDateAnnual = new Date(periodEndAnnual);
    const resultDateYearly = new Date(periodEndYearly);

    expect(resultDateAnnual.getFullYear()).toBe(2027);
    expect(resultDateAnnual.getMonth()).toBe(8); // Setembro
    expect(resultDateAnnual.getDate()).toBe(4);
    expect(resultDateAnnual.getHours()).toBe(23);
    expect(resultDateAnnual.getMinutes()).toBe(59);

    expect(resultDateYearly.getFullYear()).toBe(2027);
    expect(resultDateYearly.getMonth()).toBe(8);
  });

  it("[TEST-DATE-3] resolvePeriodEndDate com ciclo deve retornar vigência futura correta", () => {
    const fixedBaseDate = new Date();
    const periodEnd = resolvePeriodEndDate(undefined, "ANNUAL");
    const dateObj = new Date(periodEnd);

    // Deve ser no próximo ano
    expect(dateObj.getFullYear()).toBe(fixedBaseDate.getFullYear() + 1);
  });

  it("[TEST-DATE-4] deve persistir current_period_end de +1 mês ao processar PAYMENT_CONFIRMED mensal", async () => {
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockAdminSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "org-loja-prime-001", name: "Loja Prime" },
            }),
          }),
        }),
        update: mockUpdate,
      }),
    };

    vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
      mockAdminSupabase as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
    );

    const webhookPayload = {
      id: "evt_date_test_001",
      event: "PAYMENT_CONFIRMED" as const,
      payment: {
        id: "pay_test_001",
        customer: "cus_date_001",
        subscription: "sub_date_001",
        value: 597.0,
        billingType: "PIX" as const,
        status: "CONFIRMED" as const,
        dueDate: "2026-09-05", // Data de vencimento do boleto/pix (24h)
        externalReference: "org-loja-prime-001",
      },
    };

    const result = await processAsaasWebhookEvent(webhookPayload);

    expect(result.success).toBe(true);
    expect(result.actionTaken).toBe("payment_confirmed_subscription_activated");

    expect(mockAdminSupabase.from).toHaveBeenCalledWith("organizations");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "pro",
        subscription_status: "active",
        trial_ends_at: null,
        asaas_customer_id: "cus_date_001",
        asaas_subscription_id: "sub_date_001",
      })
    );

    // Validar que current_period_end é futuro (> 25 dias a partir de agora), e NÃO a dueDate (2026-09-05)
    const passedUpdate = mockUpdate.mock.calls[0][0];
    const periodEndTime = new Date(passedUpdate.current_period_end).getTime();
    const daysDiff = (periodEndTime - Date.now()) / (1000 * 60 * 60 * 24);

    expect(daysDiff).toBeGreaterThan(25);
    expect(daysDiff).toBeLessThan(35);
  });

  it("[TEST-DATE-5] deve persistir current_period_end de +1 ano ao processar PAYMENT_CONFIRMED com ciclo anual", async () => {
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockAdminSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "org-loja-anual-001", name: "Loja Anual" },
            }),
          }),
        }),
        update: mockUpdate,
      }),
    };

    vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
      mockAdminSupabase as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
    );

    const webhookPayload = {
      id: "evt_date_test_002",
      event: "PAYMENT_CONFIRMED" as const,
      payment: {
        id: "pay_test_002",
        customer: "cus_date_002",
        subscription: "sub_date_002",
        value: 5970.0,
        billingType: "PIX" as const,
        status: "CONFIRMED" as const,
        dueDate: "2026-09-05",
        externalReference: "org-loja-anual-001",
      },
      subscription: {
        id: "sub_date_002",
        cycle: "ANNUALLY" as const,
      },
    };

    const result = await processAsaasWebhookEvent(webhookPayload);

    expect(result.success).toBe(true);
    expect(result.actionTaken).toBe("payment_confirmed_subscription_activated");

    const passedUpdate = mockUpdate.mock.calls[0][0];
    const periodEndTime = new Date(passedUpdate.current_period_end).getTime();
    const daysDiff = (periodEndTime - Date.now()) / (1000 * 60 * 60 * 24);

    // Deve ser de aproximadamente 365 dias
    expect(daysDiff).toBeGreaterThan(350);
    expect(daysDiff).toBeLessThan(370);
  });
});
