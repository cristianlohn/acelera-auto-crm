/**
 * @file subscription-guard.ts
 * @description Helper de validação do ciclo de vida e status de assinatura do CRM.
 *
 * Regras:
 * - Status permitidos: 'active' e 'trialing' (acesso liberado).
 * - Status bloqueados: 'overdue', 'canceled', 'inactive', ou ausência de status (redirecionamento para paywall/billing).
 */

export function isSubscriptionValid(
  status: string | null | undefined,
  currentPeriodEnd?: string | null | undefined
): boolean {
  if (currentPeriodEnd) {
    const periodEnds = new Date(currentPeriodEnd).getTime();
    if (!isNaN(periodEnds) && periodEnds > Date.now()) {
      return status?.toLowerCase().trim() !== "canceled";
    }
  }

  if (!status) return false;
  return ["active", "trialing"].includes(status.toLowerCase().trim());
}

