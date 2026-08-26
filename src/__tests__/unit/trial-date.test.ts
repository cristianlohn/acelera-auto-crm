/**
 * @file trial-date.test.ts
 * @description Testes Unitários para o utilitário calculateTrialDaysRemaining e ciclo de vida de 14 dias de trial.
 */

import { describe, it, expect } from "vitest";
import { calculateTrialDaysRemaining } from "@/lib/utils/date";

describe("[UT-DATE] Utilitário de Cálculo de Dias Restantes do Período de Testes", () => {
  it("Deve retornar 14 dias quando nenhuma data de expiração for informada (null/undefined)", () => {
    expect(calculateTrialDaysRemaining(null)).toBe(14);
    expect(calculateTrialDaysRemaining(undefined)).toBe(14);
  });

  it("Deve retornar exatamente 14 dias para uma conta recém-criada (14 dias a partir de agora)", () => {
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
    expect(calculateTrialDaysRemaining(trialEndsAt)).toBe(14);
  });

  it("Deve calcular corretamente os dias restantes intermediários com arredondamento para cima", () => {
    const now = new Date();
    // 7 dias e 3 horas restantes -> deve arredondar para 8 dias
    const trialEndsAt7Days3Hours = new Date(
      now.getTime() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000
    ).toISOString();
    expect(calculateTrialDaysRemaining(trialEndsAt7Days3Hours)).toBe(8);

    // Exatos 5 dias restantes
    const trialEndsAt5Days = new Date(
      now.getTime() + 5 * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(calculateTrialDaysRemaining(trialEndsAt5Days)).toBe(5);

    // 12 horas restantes -> 1 dia
    const trialEndsAt12Hours = new Date(
      now.getTime() + 12 * 60 * 60 * 1000
    ).toISOString();
    expect(calculateTrialDaysRemaining(trialEndsAt12Hours)).toBe(1);
  });

  it("Deve retornar 0 para datas no passado (trial expirado)", () => {
    const now = new Date();
    const expiredYesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    expect(calculateTrialDaysRemaining(expiredYesterday)).toBe(0);

    const expiredTenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(calculateTrialDaysRemaining(expiredTenDaysAgo)).toBe(0);
  });
});
