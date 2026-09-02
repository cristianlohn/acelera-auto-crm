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
import { resolvePeriodEndDate } from "@/lib/services/asaas/subscription-service";
import { processAsaasWebhookEvent } from "@/lib/services/asaas/webhook-service";
import * as supabaseServerModule from "@/lib/supabase/server";
import * as supabaseAdminModule from "@/lib/supabase/admin";

describe("[UNIT-ASAAS-DATES] Ancoragem de Ciclo e Vigência de Faturamento", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[TEST-DATE-1] deve ancorar current_period_end exatamente em 2026-10-15T23:59:59.999Z para dueDate '2026-10-15'", () => {
    // Act
    const periodEnd = resolvePeriodEndDate("2026-10-15");

    // Assert: Independente da data atual da máquina, deve ser o final do dia UTC
    expect(periodEnd).toBe("2026-10-15T23:59:59.999Z");
  });

  it("[TEST-DATE-2] deve manter dias do ciclo anterior em pagamento antecipado sem subtrair vigência", () => {
    // Simula cliente pagando antecipadamente no início do mês uma fatura que vence no fim
    const paymentDueDate = "2026-11-20";
    const periodEnd = resolvePeriodEndDate(paymentDueDate);

    expect(periodEnd).toBe("2026-11-20T23:59:59.999Z");
  });

  it("[TEST-DATE-3] deve utilizar fallback de 30 dias caso dueDate seja nulo ou indefinido", () => {
    const before = Date.now();
    const periodEnd = resolvePeriodEndDate(undefined);

    const periodEndTime = new Date(periodEnd).getTime();
    const expectedApproxTime = before + 30 * 24 * 60 * 60 * 1000;

    // Diferença máxima de 2 segundos devido à execução
    expect(Math.abs(periodEndTime - expectedApproxTime)).toBeLessThan(2000);
  });

  it("[TEST-DATE-4] deve persistir current_period_end ancorado no dueDate ao processar PAYMENT_CONFIRMED", async () => {
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
        dueDate: "2026-10-15",
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
        current_period_end: "2026-10-15T23:59:59.999Z",
        asaas_customer_id: "cus_date_001",
        asaas_subscription_id: "sub_date_001",
      })
    );
  });
});
