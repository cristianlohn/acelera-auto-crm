/**
 * @file business-hours.ts
 * @description Tipagem oficial e agendamento padrão de horários de funcionamento e SLA por loja.
 */

export interface DaySchedule {
  isOpen: boolean;
  openTime: string;  // Formato "HH:mm" (ex: "08:30")
  closeTime: string; // Formato "HH:mm" (ex: "18:30")
}

export type WeekdayKey = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Domingo, 1 = Segunda ... 6 = Sábado

export interface StoreBusinessHours {
  slaMode: "business_hours" | "continuous"; // "business_hours" pausa fora da jornada; "continuous" roda 24/7
  schedule: Record<WeekdayKey, DaySchedule>;
}

export const DEFAULT_AUTOMOTIVE_SCHEDULE: StoreBusinessHours = {
  slaMode: "business_hours",
  schedule: {
    1: { isOpen: true, openTime: "08:30", closeTime: "18:30" }, // Seg
    2: { isOpen: true, openTime: "08:30", closeTime: "18:30" }, // Ter
    3: { isOpen: true, openTime: "08:30", closeTime: "18:30" }, // Qua
    4: { isOpen: true, openTime: "08:30", closeTime: "18:30" }, // Qui
    5: { isOpen: true, openTime: "08:30", closeTime: "18:30" }, // Sex
    6: { isOpen: true, openTime: "09:00", closeTime: "13:00" }, // Sáb (Feirão / Plantão)
    0: { isOpen: false, openTime: "09:00", closeTime: "13:00" }, // Dom fechado
  },
};

export const WEEKDAY_LABELS: Record<WeekdayKey, { name: string; short: string }> = {
  0: { name: "Domingo", short: "Dom" },
  1: { name: "Segunda-feira", short: "Seg" },
  2: { name: "Terça-feira", short: "Ter" },
  3: { name: "Quarta-feira", short: "Qua" },
  4: { name: "Quinta-feira", short: "Qui" },
  5: { name: "Sexta-feira", short: "Sex" },
  6: { name: "Sábado", short: "Sáb" },
};

/**
 * Converte string ou objeto bruto para StoreBusinessHours de forma segura e resiliente.
 */
export function parseStoreBusinessHours(raw?: unknown): StoreBusinessHours {
  if (!raw) return DEFAULT_AUTOMOTIVE_SCHEDULE;

  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return DEFAULT_AUTOMOTIVE_SCHEDULE;
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return DEFAULT_AUTOMOTIVE_SCHEDULE;
  }

  const obj = parsed as Record<string, unknown>;
  const slaMode = obj.slaMode === "continuous" ? "continuous" : "business_hours";
  const rawSchedule = (obj.schedule && typeof obj.schedule === "object")
    ? (obj.schedule as Record<string, unknown>)
    : null;

  if (!rawSchedule) {
    return { ...DEFAULT_AUTOMOTIVE_SCHEDULE, slaMode };
  }

  const schedule: Record<WeekdayKey, DaySchedule> = { ...DEFAULT_AUTOMOTIVE_SCHEDULE.schedule };

  for (let d = 0; d <= 6; d++) {
    const key = d as WeekdayKey;
    const dayItem = rawSchedule[d] || rawSchedule[String(d)];
    if (dayItem && typeof dayItem === "object") {
      const itemObj = dayItem as Record<string, unknown>;
      const isOpen = typeof itemObj.isOpen === "boolean" ? itemObj.isOpen : schedule[key].isOpen;
      const openTime = typeof itemObj.openTime === "string" && itemObj.openTime.includes(":")
        ? itemObj.openTime
        : schedule[key].openTime;
      const closeTime = typeof itemObj.closeTime === "string" && itemObj.closeTime.includes(":")
        ? itemObj.closeTime
        : schedule[key].closeTime;

      schedule[key] = { isOpen, openTime, closeTime };
    }
  }

  return {
    slaMode,
    schedule,
  };
}
