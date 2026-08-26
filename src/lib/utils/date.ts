/**
 * @file date.ts
 * @description Utilitários para manipulação e cálculos de datas e períodos de trial.
 */

/**
 * Calcula a quantidade de dias restantes do período de testes (Trial).
 *
 * @param trialEndsAt Data de término do trial (ISO string, Date ou null).
 * @returns Número de dias restantes inteiros (arredondado para cima, mínimo 0, padrão 14).
 */
export function calculateTrialDaysRemaining(
  trialEndsAt?: string | Date | null
): number {
  if (!trialEndsAt) return 14;
  const now = new Date();
  const end = new Date(trialEndsAt);
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
