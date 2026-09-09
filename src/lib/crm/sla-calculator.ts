/**
 * @file sla-calculator.ts
 * @description Engine determinística de cálculo de SLA adaptativo considerando os horários de funcionamento por loja.
 */

import {
  StoreBusinessHours,
  DEFAULT_AUTOMOTIVE_SCHEDULE,
  WeekdayKey,
} from "@/types/business-hours";

/**
 * Calcula os minutos úteis decorridos entre duas datas considerando os horários da loja.
 * Caso config.slaMode seja 'continuous', calcula o tempo corrido tradicional.
 */
export function calculateBusinessMinutesElapsed(
  startDate: Date,
  endDate: Date = new Date(),
  config: StoreBusinessHours = DEFAULT_AUTOMOTIVE_SCHEDULE
): number {
  if (startDate >= endDate) return 0;

  if (config.slaMode === "continuous") {
    return Math.floor((endDate.getTime() - startDate.getTime()) / 60000);
  }

  let totalMinutes = 0;

  // Itera dia a dia entre o dia inicial e final
  const currentDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const finalDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  while (currentDay <= finalDay) {
    const weekday = currentDay.getDay() as WeekdayKey;
    const dayConfig = config.schedule[weekday];

    if (dayConfig && dayConfig.isOpen) {
      const [openH, openM] = dayConfig.openTime.split(":").map(Number);
      const [closeH, closeM] = dayConfig.closeTime.split(":").map(Number);

      const dayOpen = new Date(
        currentDay.getFullYear(),
        currentDay.getMonth(),
        currentDay.getDate(),
        openH,
        openM,
        0,
        0
      );

      const dayClose = new Date(
        currentDay.getFullYear(),
        currentDay.getMonth(),
        currentDay.getDate(),
        closeH,
        closeM,
        0,
        0
      );

      if (dayClose > dayOpen) {
        const overlapStart = Math.max(startDate.getTime(), dayOpen.getTime());
        const overlapEnd = Math.min(endDate.getTime(), dayClose.getTime());

        if (overlapEnd > overlapStart) {
          totalMinutes += Math.floor((overlapEnd - overlapStart) / 60000);
        }
      }
    }

    currentDay.setDate(currentDay.getDate() + 1);
  }

  return totalMinutes;
}

/**
 * Verifica se a loja está aberta no momento da data fornecida conforme as regras do calendário.
 */
export function isStoreCurrentlyOpen(
  date: Date = new Date(),
  config: StoreBusinessHours = DEFAULT_AUTOMOTIVE_SCHEDULE
): boolean {
  if (config.slaMode === "continuous") return true;

  const day = date.getDay() as WeekdayKey;
  const dayConfig = config.schedule[day];
  if (!dayConfig || !dayConfig.isOpen) return false;

  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const [openH, openM] = dayConfig.openTime.split(":").map(Number);
  const [closeH, closeM] = dayConfig.closeTime.split(":").map(Number);

  return currentMinutes >= openH * 60 + openM && currentMinutes <= closeH * 60 + closeM;
}

/**
 * Retorna o próximo momento de abertura caso a loja esteja fechada no momento especificado.
 */
export function getNextStoreOpenDate(
  date: Date = new Date(),
  config: StoreBusinessHours = DEFAULT_AUTOMOTIVE_SCHEDULE
): Date | null {
  if (config.slaMode === "continuous") return date;

  const searchDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  for (let i = 0; i < 7; i++) {
    const weekday = searchDay.getDay() as WeekdayKey;
    const dayConfig = config.schedule[weekday];

    if (dayConfig && dayConfig.isOpen) {
      const [openH, openM] = dayConfig.openTime.split(":").map(Number);
      const potentialOpen = new Date(
        searchDay.getFullYear(),
        searchDay.getMonth(),
        searchDay.getDate(),
        openH,
        openM,
        0,
        0
      );

      if (potentialOpen > date) {
        return potentialOpen;
      }
    }

    searchDay.setDate(searchDay.getDate() + 1);
  }

  return null;
}
