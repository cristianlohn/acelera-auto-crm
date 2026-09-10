/**
 * @file billing-upgrade-decoupling.test.ts
 * @description Testes unitários para validação do desacoplamento de faturas de upgrade vs status do tenant ativo.
 *
 * Cenários Testados:
 * 1. Tenant com Plano Pro anual válido até 2027 e solicitação de upgrade pendente mantém acesso e status 'active'.
 * 2. cancelPendingUpgradeAction chama cancelamento no gateway Asaas, limpa Supabase e restaura status 'active'.
 * 3. Webhook de fatura avulsa vencida não suspende tenant com período pago ativo no futuro.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSubscriptionOverviewAction,
  cancelPendingUpgradeAction,
} from "@/app/actions/billing-actions";
import { checkUserSubscriptionGuardAction } from "@/app/actions/auth";
import { getOrganizationAccessStatus } from "@/lib/auth/subscription";
import { isSubscriptionValid } from "@/lib/auth/subscription-guard";
import { processAsaasWebhookEvent } from "@/lib/services/asaas/webhook-service";
import * as asaasServiceModule from "@/lib/services/asaas/subscription-service";
import * as tenantAuthModule from "@/lib/auth/tenant";
import * as supabaseServerModule from "@/lib/supabase/server";
import * as supabaseAdminModule from "@/lib/supabase/admin";

describe("[UNIT-BILLING-DECOUPLING] Desacoplamento de Upgrade vs Suspensão de Tenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[CENARIO-1] Tenant com Plano Pro anual válido até 2027 com solicitação de upgrade pendente mantém acesso e status 'active'", async () => {
    const futureDate = "2027-09-08T23:59:59.999Z";

    // Mock do contexto de tenant: loja Pro anual com 364 dias restantes e solicitação de upgrade pendente
    vi.spyOn(tenantAuthModule, "resolveUserTenantContext").mockResolvedValue({
      userId: "user-owner-001",
      userEmail: "dono@concessionaria.com.br",
      organizationId: "org-pro-anual-001",
      organization: {
        id: "org-pro-anual-001",
        name: "Concessionária Prime Auto",
        plan: "pro",
        subscription_status: "active",
        current_period_end: futureDate,
        pending_plan: "enterprise",
        pending_invoice_id: "pay_upgrade_pix_001",
        asaas_subscription_id: "sub_active_pro_2026",
        asaas_customer_id: "cus_prime_001",
      } as unknown as tenantAuthModule.TenantContextResult["organization"],
      profile: {
        id: "user-owner-001",
        role: "admin",
        organization_id: "org-pro-anual-001",
      } as unknown as tenantAuthModule.TenantContextResult["profile"],
      isDemo: false,
      needsOnboarding: false,
    });

    vi.spyOn(asaasServiceModule, "getAsaasSubscriptionInvoices").mockResolvedValue([
      {
        id: "pay_upgrade_pix_001",
        dueDate: "2026-09-12",
        paymentDate: null,
        value: 12970,
        billingType: "PIX",
        status: "PENDING",
      },
    ]);

    // 1. Overview da assinatura
    const overviewRes = await getSubscriptionOverviewAction();
    expect(overviewRes.success).toBe(true);
    expect(overviewRes.data?.status).toBe("active");
    expect(overviewRes.data?.daysRemaining).toBeGreaterThan(300);
    expect(overviewRes.data?.hasPendingUpgrade).toBe(true);
    expect(overviewRes.data?.pendingPlan).toBe("enterprise");

    // 2. Validação canônica de permissão de acesso
    const accessStatus = getOrganizationAccessStatus(
      {
        id: "org-pro-anual-001",
        name: "Concessionária Prime Auto",
        plan: "pro",
        subscription_status: "active",
        current_period_end: futureDate,
      } as unknown as Parameters<typeof getOrganizationAccessStatus>[0],
      "admin"
    );
    expect(accessStatus.hasAccess).toBe(true);
    expect(accessStatus.reason).toBe("ACTIVE_SUBSCRIPTION");

    // 3. Validação pelo SubscriptionGuard do Auth
    const guardRes = await checkUserSubscriptionGuardAction();
    expect(guardRes.isValid).toBe(true);
    expect(guardRes.status).toBe("active");

    // 4. Validação por isSubscriptionValid considerando período futuro
    expect(isSubscriptionValid("past_due", futureDate)).toBe(true);
    expect(isSubscriptionValid("active", futureDate)).toBe(true);
  });

  it("[CENARIO-2] cancelPendingUpgradeAction chama cancelamento no Asaas, limpa Supabase e restaura status 'active'", async () => {
    const futureDate = "2027-09-08T23:59:59.999Z";

    vi.spyOn(tenantAuthModule, "resolveUserTenantContext").mockResolvedValue({
      userId: "user-owner-002",
      userEmail: "dono2@concessionaria.com.br",
      organizationId: "org-pro-002",
      organization: {
        id: "org-pro-002",
        name: "Concessionária Alpha",
        plan: "pro",
        subscription_status: "active",
        current_period_end: futureDate,
        pending_plan: "enterprise",
        pending_invoice_id: "pay_upgrade_alpha_999",
      } as unknown as tenantAuthModule.TenantContextResult["organization"],
      profile: {
        id: "user-owner-002",
        role: "owner",
        organization_id: "org-pro-002",
      } as unknown as tenantAuthModule.TenantContextResult["profile"],
      isDemo: false,
      needsOnboarding: false,
    });

    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockAdmin = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "org-pro-002",
                pending_plan: "enterprise",
                pending_invoice_id: "pay_upgrade_alpha_999",
                current_period_end: futureDate,
                subscription_status: "active",
              },
            }),
          }),
        }),
        update: mockUpdate,
      }),
    };

    vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
      mockAdmin as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
    );

    const cancelChargeSpy = vi
      .spyOn(asaasServiceModule, "cancelAsaasPendingCharge")
      .mockResolvedValue(true);

    const res = await cancelPendingUpgradeAction();

    expect(res.success).toBe(true);
    expect(cancelChargeSpy).toHaveBeenCalledWith("pay_upgrade_alpha_999");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        pending_plan: null,
        pending_invoice_id: null,
        subscription_status: "active",
      })
    );
  });

  it("[CENARIO-3] Webhook de fatura avulsa/upgrade vencida não suspende tenant com período pago ativo", async () => {
    const futureDate = "2027-09-08T23:59:59.999Z";

    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockAdmin = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "org-pro-003",
                name: "Concessionária Beta",
                plan: "pro",
                subscription_status: "active",
                current_period_end: futureDate,
                pending_plan: "enterprise",
                pending_invoice_id: "pay_upgrade_beta_888",
                asaas_subscription_id: "sub_active_pro_main",
              },
            }),
          }),
        }),
        update: mockUpdate,
      }),
    };

    vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
      mockAdmin as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
    );

    // Evento de fatura vencida da cobrança Pix de upgrade
    const webhookPayload = {
      id: "evt_upgrade_ovd_003",
      event: "PAYMENT_OVERDUE" as const,
      payment: {
        id: "pay_upgrade_beta_888",
        customer: "cus_beta_003",
        value: 12970.0,
        billingType: "PIX" as const,
        status: "OVERDUE" as const,
        dueDate: "2026-09-05",
        externalReference: "org-pro-003",
      },
    };

    const result = await processAsaasWebhookEvent(webhookPayload);

    expect(result.success).toBe(true);
    expect(result.actionTaken).toBe("pending_upgrade_overdue_discarded");

    // Deve limpar o upgrade pendente SEM alterar subscription_status para past_due nem mudar plan
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        pending_plan: null,
        pending_invoice_id: null,
      })
    );

    const updateCallPayload = mockUpdate.mock.calls[0][0];
    expect(updateCallPayload).not.toHaveProperty("subscription_status");
    expect(updateCallPayload).not.toHaveProperty("plan");
  });
});
