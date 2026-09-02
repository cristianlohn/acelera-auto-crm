/**
 * @file subscription-guard.test.ts
 * @description Suíte de Testes Unitários do Guard de Ciclo de Vida de Assinatura (getOrganizationAccessStatus).
 *
 * Cenários Testados:
 * - [UT-SUB.1]: Validar acesso liberado quando trial_ends_at está no futuro.
 * - [UT-SUB.2]: Validar bloqueio (hasAccess: false) quando trial_ends_at está no passado ou ausente.
 * - [UT-SUB.3]: Validar acesso liberado com assinatura 'active'.
 * - [UT-SUB.4]: Validar bloqueio com assinatura 'canceled' ou desconhecida.
 * - [UT-SUB.5]: Validar bypass total para role 'SUPERADMIN'.
 * - [UT-SUB.6]: Validar acesso em período de graça com aviso quando status é 'past_due'.
 */

import { describe, it, expect } from "vitest";
import { getOrganizationAccessStatus } from "@/lib/auth/subscription";
import { isSubscriptionValid } from "@/lib/auth/subscription-guard";
import type { Organization } from "@/types/crm";

describe("[UT-SUB] Guard de Assinatura e Ciclo de Vida (getOrganizationAccessStatus)", () => {
  const baseOrg: Organization = {
    id: "org_123",
    name: "Auto Prime Veículos",
    slug: "auto-prime",
    subscription_status: "trialing",
    trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias no futuro
  };

  it("[UT-SUB.1] Deve liberar acesso quando trial_ends_at estiver no futuro", () => {
    // Arrange: Trial válido com 7 dias restantes
    const org: Organization = {
      ...baseOrg,
      subscription_status: "trialing",
      trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Act
    const status = getOrganizationAccessStatus(org, "admin");

    // Assert
    expect(status.hasAccess).toBe(true);
    expect(status.reason).toBe("TRIAL_ACTIVE");
    expect(status.daysRemaining).toBeGreaterThanOrEqual(6);
    expect(status.daysRemaining).toBeLessThanOrEqual(8);
  });

  it("[UT-SUB.2] Deve bloquear acesso quando trial_ends_at estiver no passado ou nulo", () => {
    // Arrange: Trial expirado (ontem)
    const expiredOrg: Organization = {
      ...baseOrg,
      subscription_status: "trialing",
      trial_ends_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    };

    // Act
    const status = getOrganizationAccessStatus(expiredOrg, "admin");

    // Assert
    expect(status.hasAccess).toBe(false);
    expect(status.reason).toBe("TRIAL_EXPIRED");

    // Arrange: Trial sem data definida
    const nullTrialOrg: Organization = {
      ...baseOrg,
      subscription_status: "trialing",
      trial_ends_at: null,
    };

    expect(getOrganizationAccessStatus(nullTrialOrg, "admin")).toEqual({
      hasAccess: false,
      reason: "TRIAL_EXPIRED",
    });
  });

  it("[UT-SUB.3] Deve liberar acesso irrestrito para assinatura 'active'", () => {
    // Arrange
    const activeOrg: Organization = {
      ...baseOrg,
      subscription_status: "active",
      trial_ends_at: null,
    };

    // Act
    const status = getOrganizationAccessStatus(activeOrg, "vendedor");

    // Assert
    expect(status.hasAccess).toBe(true);
    expect(status.reason).toBe("ACTIVE_SUBSCRIPTION");
  });

  it("[UT-SUB.4] Deve bloquear acesso quando a assinatura estiver 'canceled' ou 'unpaid'", () => {
    // Arrange: Cancelada
    const canceledOrg: Organization = {
      ...baseOrg,
      subscription_status: "canceled",
    };

    expect(getOrganizationAccessStatus(canceledOrg, "admin")).toEqual({
      hasAccess: false,
      reason: "SUBSCRIPTION_INACTIVE",
    });

    // Arrange: Unpaid
    const unpaidOrg: Organization = {
      ...baseOrg,
      subscription_status: "unpaid",
    };

    expect(getOrganizationAccessStatus(unpaidOrg, "admin")).toEqual({
      hasAccess: false,
      reason: "SUBSCRIPTION_INACTIVE",
    });
  });

  it("[UT-SUB.5] Deve conceder bypass total e irrestrito para usuário 'SUPERADMIN'", () => {
    // Arrange: Organização até com assinatura cancelada ou sem dados
    const brokenOrg: Organization = {
      ...baseOrg,
      subscription_status: "canceled",
      trial_ends_at: new Date(Date.now() - 1000000).toISOString(),
    };

    // Act
    const status = getOrganizationAccessStatus(brokenOrg, "SUPERADMIN");

    // Assert
    expect(status.hasAccess).toBe(true);
    expect(status.reason).toBe("SUPERADMIN_BYPASS");

    // Também com role em minúsculas
    expect(getOrganizationAccessStatus(null, "superadmin")).toEqual({
      hasAccess: true,
      reason: "SUPERADMIN_BYPASS",
    });
  });

  it("[UT-SUB.6] Deve liberar acesso em período de tolerância com aviso para status 'past_due'", () => {
    // Arrange
    const pastDueOrg: Organization = {
      ...baseOrg,
      subscription_status: "past_due",
    };

    // Act
    const status = getOrganizationAccessStatus(pastDueOrg, "gerente");

    // Assert
    expect(status.hasAccess).toBe(true);
    expect(status.reason).toBe("PAST_DUE_GRACE");
    expect(status.warning).toBe(true);
  });
});

describe("[UT-SUB-GUARD] Helper isSubscriptionValid", () => {
  it("Deve retornar true para 'active' e 'trialing'", () => {
    expect(isSubscriptionValid("active")).toBe(true);
    expect(isSubscriptionValid("trialing")).toBe(true);
    expect(isSubscriptionValid("ACTIVE")).toBe(true);
    expect(isSubscriptionValid("TRIALING")).toBe(true);
    expect(isSubscriptionValid(" active ")).toBe(true);
  });

  it("Deve retornar false para 'overdue', 'canceled', null e undefined", () => {
    expect(isSubscriptionValid("overdue")).toBe(false);
    expect(isSubscriptionValid("canceled")).toBe(false);
    expect(isSubscriptionValid("inactive")).toBe(false);
    expect(isSubscriptionValid("past_due")).toBe(false);
    expect(isSubscriptionValid(null)).toBe(false);
    expect(isSubscriptionValid(undefined)).toBe(false);
    expect(isSubscriptionValid("")).toBe(false);
  });
});
