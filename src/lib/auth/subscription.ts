/**
 * @file subscription.ts
 * @description Helper de Validação do Ciclo de Vida da Assinatura e Controle de Acesso (Subscription Guard).
 *
 * Estados avaliados:
 * - SUPERADMIN_BYPASS: Acesso irrestrito independente de assinatura.
 * - ACTIVE_SUBSCRIPTION: Assinatura paga e regularizada.
 * - TRIAL_ACTIVE: Período de teste gratuito ativo com cálculo de dias restantes.
 * - TRIAL_EXPIRED: Período de teste finalizado sem plano contratado (Paywall obrigatório).
 * - PAST_DUE_GRACE: Inadimplência em período de tolerância/graça (acesso liberado com aviso).
 * - SUBSCRIPTION_INACTIVE: Assinatura cancelada, pausada ou inválida.
 */

import type { Organization } from "@/types/crm";
import { calculateTrialDaysRemaining } from "@/lib/utils/date";

export type SubscriptionAccessReason =
  | "SUPERADMIN_BYPASS"
  | "ACTIVE_SUBSCRIPTION"
  | "TRIAL_ACTIVE"
  | "TRIAL_EXPIRED"
  | "PAST_DUE_GRACE"
  | "SUBSCRIPTION_INACTIVE";

export interface OrganizationAccessStatus {
  hasAccess: boolean;
  reason: SubscriptionAccessReason;
  daysRemaining?: number;
  warning?: boolean;
}

/**
 * Avalia o status de acesso de uma organização e usuário às rotas do sistema.
 *
 * @param org Dados da organização/tenant.
 * @param userRole Papel do usuário logado (ex: 'admin', 'gerente', 'vendedor', 'superadmin').
 * @returns Status de permissão de acesso e motivo detalhado.
 */
export function getOrganizationAccessStatus(
  org: Organization | null | undefined,
  userRole?: string
): OrganizationAccessStatus {
  // 1. Bypass total para Super Admin
  if (userRole && userRole.toUpperCase() === "SUPERADMIN") {
    return {
      hasAccess: true,
      reason: "SUPERADMIN_BYPASS",
    };
  }

  // 2. Sem organização vinculada
  if (!org) {
    return {
      hasAccess: false,
      reason: "SUBSCRIPTION_INACTIVE",
    };
  }

  const status = (org.subscription_status || "").toLowerCase();
  const plan = (org.plan || "").toLowerCase();

  // 3. Assinatura Ativa
  if (status === "active") {
    return {
      hasAccess: true,
      reason: "ACTIVE_SUBSCRIPTION",
    };
  }

  // 4. Período de Teste (Trial)
  if (status === "trialing" || plan === "trial") {
    if (org.trial_ends_at) {
      const trialEnds = new Date(org.trial_ends_at).getTime();
      const now = Date.now();

      if (trialEnds > now) {
        const daysRemaining = calculateTrialDaysRemaining(org.trial_ends_at);
        return {
          hasAccess: true,
          reason: "TRIAL_ACTIVE",
          daysRemaining,
        };
      }
    }

    return {
      hasAccess: false,
      reason: "TRIAL_EXPIRED",
    };
  }

  // 5. Inadimplência em Período de Graça
  if (status === "past_due") {
    return {
      hasAccess: true,
      reason: "PAST_DUE_GRACE",
      warning: true,
    };
  }

  // 6. Cancelada ou Inativa
  return {
    hasAccess: false,
    reason: "SUBSCRIPTION_INACTIVE",
  };
}
