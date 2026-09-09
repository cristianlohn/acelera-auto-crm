/**
 * @file store-sla-calculator.test.ts
 * @description Testes unitários para o cálculo adaptativo de SLA por horário de loja.
 */

import { describe, it, expect } from "vitest";
import {
  calculateBusinessMinutesElapsed,
  isStoreCurrentlyOpen,
} from "@/lib/crm/sla-calculator";
import {
  StoreBusinessHours,
  DEFAULT_AUTOMOTIVE_SCHEDULE,
  parseStoreBusinessHours,
} from "@/types/business-hours";
import {
  calculateManagerCockpitMetrics,
  calculateCockpitMetrics,
  generatePrescriptiveActions,
  LeadAnalyticsInput,
} from "@/lib/crm/analytics";

describe("[UNIT-SLA-CALCULATOR] Engine de SLA Adaptativa por Horário da Loja", () => {
  // Configuração Canônica Automotiva: Seg-Sex 08:30-18:30, Sáb 09:00-13:00, Dom Fechado
  const standardSchedule = DEFAULT_AUTOMOTIVE_SCHEDULE;

  it("[TEST-SLA-1] Loja Convencional: Lead recebido domingo às 14h medido segunda às 08h45 -> 15 minutos úteis", () => {
    // 2026-09-06 é Domingo, 2026-09-07 é Segunda
    const sundayReceived = new Date(2026, 8, 6, 14, 0, 0); // Dom 14:00
    const mondayChecked = new Date(2026, 8, 7, 8, 45, 0);  // Seg 08:45

    const minutes = calculateBusinessMinutesElapsed(
      sundayReceived,
      mondayChecked,
      standardSchedule
    );

    // Segunda abre às 08:30, até 08:45 = 15 minutos úteis
    expect(minutes).toBe(15);
  });

  it("[TEST-SLA-2] Loja em Feirão no Fim de Semana: Lead recebido domingo às 09h15 medido domingo às 10h00 -> 45 minutos úteis", () => {
    const feiraoSchedule: StoreBusinessHours = {
      slaMode: "business_hours",
      schedule: {
        ...DEFAULT_AUTOMOTIVE_SCHEDULE.schedule,
        6: { isOpen: true, openTime: "08:30", closeTime: "18:00" }, // Sáb integral
        0: { isOpen: true, openTime: "09:00", closeTime: "14:00" }, // Dom feirão 09h às 14h
      },
    };

    const sundayReceived = new Date(2026, 8, 6, 9, 15, 0); // Dom 09:15
    const sundayChecked = new Date(2026, 8, 6, 10, 0, 0);  // Dom 10:00

    const minutes = calculateBusinessMinutesElapsed(
      sundayReceived,
      sundayChecked,
      feiraoSchedule
    );

    // Aberto desde 09:00, intervalo 09:15 até 10:00 = 45 minutos úteis
    expect(minutes).toBe(45);
  });

  it("[TEST-SLA-3] Loja com SLA 24/7 (slaMode: 'continuous'): Tempo corrido integral sem interrupções", () => {
    const continuousSchedule: StoreBusinessHours = {
      slaMode: "continuous",
      schedule: DEFAULT_AUTOMOTIVE_SCHEDULE.schedule,
    };

    const sundayReceived = new Date(2026, 8, 6, 14, 0, 0); // Dom 14:00
    const mondayChecked = new Date(2026, 8, 7, 8, 45, 0);  // Seg 08:45 (18h45min depois = 1125 minutos)

    const minutes = calculateBusinessMinutesElapsed(
      sundayReceived,
      mondayChecked,
      continuousSchedule
    );

    expect(minutes).toBe(1125);
  });

  it("[TEST-SLA-4] Intervalo durante dia de semana normal dentro do expediente", () => {
    const wednesdayStart = new Date(2026, 8, 9, 10, 0, 0); // Qua 10:00
    const wednesdayEnd = new Date(2026, 8, 9, 11, 30, 0);   // Qua 11:30

    const minutes = calculateBusinessMinutesElapsed(
      wednesdayStart,
      wednesdayEnd,
      standardSchedule
    );

    expect(minutes).toBe(90);
  });

  it("[TEST-SLA-5] Lead recebido após o fechamento na sexta medido na segunda", () => {
    // 2026-09-04 é Sexta, 2026-09-05 é Sábado (09h às 13h = 240 min), 2026-09-06 é Domingo (0 min), 2026-09-07 é Segunda
    const fridayNight = new Date(2026, 8, 4, 19, 0, 0);   // Sex 19:00 (fechado)
    const mondayMorning = new Date(2026, 8, 7, 9, 0, 0);   // Seg 09:00 (abre 08:30 -> 30 min)

    const minutes = calculateBusinessMinutesElapsed(
      fridayNight,
      mondayMorning,
      standardSchedule
    );

    // Sábado: 4h = 240 min + Segunda: 30 min = 270 min úteis
    expect(minutes).toBe(270);
  });

  it("[TEST-SLA-6] Casos de Borda: datas invertidas ou iguais retornam 0", () => {
    const d1 = new Date(2026, 8, 7, 10, 0, 0);
    const d2 = new Date(2026, 8, 7, 9, 0, 0);

    expect(calculateBusinessMinutesElapsed(d1, d2, standardSchedule)).toBe(0);
    expect(calculateBusinessMinutesElapsed(d1, d1, standardSchedule)).toBe(0);
  });

  describe("isStoreCurrentlyOpen", () => {
    it("deve retornar true em horário de expediente da semana", () => {
      const wednesdayAfternoon = new Date(2026, 8, 9, 14, 0, 0); // Qua 14:00
      expect(isStoreCurrentlyOpen(wednesdayAfternoon, standardSchedule)).toBe(true);
    });

    it("deve retornar false fora do horário na semana", () => {
      const wednesdayNight = new Date(2026, 8, 9, 20, 0, 0); // Qua 20:00
      expect(isStoreCurrentlyOpen(wednesdayNight, standardSchedule)).toBe(false);
    });

    it("deve retornar false no domingo fechado e true no sábado de feirão", () => {
      const sundayNoon = new Date(2026, 8, 6, 12, 0, 0); // Dom 12:00
      expect(isStoreCurrentlyOpen(sundayNoon, standardSchedule)).toBe(false);

      const saturdayMorning = new Date(2026, 8, 5, 10, 0, 0); // Sáb 10:00
      expect(isStoreCurrentlyOpen(saturdayMorning, standardSchedule)).toBe(true);
    });

    it("deve retornar sempre true no modo continuous", () => {
      const sundayMidnight = new Date(2026, 8, 6, 3, 0, 0);
      expect(
        isStoreCurrentlyOpen(sundayMidnight, {
          slaMode: "continuous",
          schedule: standardSchedule.schedule,
        })
      ).toBe(true);
    });
  });

  describe("parseStoreBusinessHours", () => {
    it("deve fazer fallback seguro para DEFAULT_AUTOMOTIVE_SCHEDULE quando input for inválido", () => {
      expect(parseStoreBusinessHours(null)).toEqual(DEFAULT_AUTOMOTIVE_SCHEDULE);
      expect(parseStoreBusinessHours("")).toEqual(DEFAULT_AUTOMOTIVE_SCHEDULE);
      expect(parseStoreBusinessHours("invalid-json")).toEqual(DEFAULT_AUTOMOTIVE_SCHEDULE);
    });

    it("deve deserializar string JSON válida preservando alterações", () => {
      const custom: StoreBusinessHours = {
        slaMode: "continuous",
        schedule: {
          ...DEFAULT_AUTOMOTIVE_SCHEDULE.schedule,
          0: { isOpen: true, openTime: "10:00", closeTime: "16:00" },
        },
      };

      const result = parseStoreBusinessHours(JSON.stringify(custom));
      expect(result.slaMode).toBe("continuous");
      expect(result.schedule[0].isOpen).toBe(true);
      expect(result.schedule[0].openTime).toBe("10:00");
    });
  });

  describe("Integração Cockpit & Analytics com Horários de Loja", () => {
    it("deve evitar falso alerta no Cockpit para lead recebido no domingo e medido segunda às 08h45", () => {
      const sundayReceived = new Date(2026, 8, 6, 14, 0, 0); // Dom 14:00 (fechado)
      const mondayChecked = new Date(2026, 8, 7, 8, 45, 0);  // Seg 08:45 (15 min de loja aberta)

      const leads: LeadAnalyticsInput[] = [
        {
          id: "lead-sunday-1",
          name: "Carlos Ferreira",
          phone: "11988887777",
          status: "novo",
          createdAt: sundayReceived.toISOString(),
          estimatedValue: 120000,
          sellerName: "Rafael Alves",
        },
      ];

      // 1. Com horário da loja (evita falso alerta: 15 min úteis <= limite de 15 min)
      const metricsBusiness = calculateManagerCockpitMetrics(leads, {
        now: mondayChecked,
        businessHours: standardSchedule,
      });

      expect(metricsBusiness.overdueLeadsCount).toBe(0);
      expect(metricsBusiness.bottlenecks?.withoutReturnCount).toBe(0);
      expect(metricsBusiness.valueAtRisk).toBe(0);

      // 2. Sem horário da loja (tempo corrido tradicional: 1125 min > 15 min -> alerta falso)
      const metricsContinuous = calculateManagerCockpitMetrics(leads, {
        now: mondayChecked,
        businessHours: {
          slaMode: "continuous",
          schedule: standardSchedule.schedule,
        },
      });

      expect(metricsContinuous.overdueLeadsCount).toBe(1);
      expect(metricsContinuous.bottlenecks?.withoutReturnCount).toBe(1);
      expect(metricsContinuous.valueAtRisk).toBe(120000);
    });

    it("deve gerar alerta de prescrição quando os minutos úteis ultrapassarem o limite", () => {
      const sundayReceived = new Date(2026, 8, 6, 14, 0, 0); // Dom 14:00 (fechado)
      const mondayLateChecked = new Date(2026, 8, 7, 8, 55, 0); // Seg 08:55 (25 min úteis > 15 min)

      const leads: LeadAnalyticsInput[] = [
        {
          id: "lead-sunday-2",
          name: "Juliana Mendes",
          phone: "11999998888",
          status: "novo",
          createdAt: sundayReceived.toISOString(),
          sellerName: "Rafael Alves",
        },
      ];

      const actions = generatePrescriptiveActions(leads, {
        now: mondayLateChecked,
        businessHours: standardSchedule,
      });

      expect(actions.length).toBe(1);
      expect(actions[0].sellerName).toBe("Rafael Alves");
      expect(actions[0].urgencyType).toBe("danger");
      expect(actions[0].timeText).toContain("25 min");
    });

    it("deve calcular calculateCockpitMetrics respeitando horários de loja", () => {
      const sundayReceived = new Date(2026, 8, 6, 14, 0, 0);
      const mondayChecked = new Date(2026, 8, 7, 8, 40, 0); // 10 min úteis decorridos

      const leads: LeadAnalyticsInput[] = [
        {
          id: "lead-sla-test",
          name: "Marina Souza",
          status: "novo",
          createdAt: sundayReceived.toISOString(),
        },
      ];

      const result = calculateCockpitMetrics(leads, 15, standardSchedule, mondayChecked);
      // Como 10 min <= 15 min, não há lead estourado
      expect(result.unansweredLeadsCount).toBe(0);
    });
  });
});
