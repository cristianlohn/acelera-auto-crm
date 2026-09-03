/**
 * @file analytics.test.ts
 * @description Suíte de Testes Unitários para Motor de Cálculo de SLA de Atendimento (Tempo Real + Histórico).
 *
 * Cenários Testados:
 * - [TEST-SLA-UNANSWERED-BREACHED]: 8 leads sem resposta criados há 30 min retornam slaPercentage: 0 e averageResponseMinutes: 30.
 * - [TEST-SLA-ANSWERED-ON-TIME]: Leads atendidos dentro da janela de 15 min retornam slaPercentage: 100.
 * - [TEST-SLA-EMPTY-OR-RECENT]: Leads recentes dentro dos 15 min de tolerância retornam slaPercentage: 100.
 * - [TEST-SLA-WEIGHTED-MIXED]: Combinação de leads atendidos no prazo, fora do prazo e estourados em aberto.
 * - [TEST-SLA-EMPTY-STORE]: Loja sem leads retorna slaPercentage: 100 e averageResponseMinutes: 0.
 */

import { describe, it, expect } from "vitest";
import {
  calculateCockpitMetrics,
  calculateManagerCockpitMetrics,
  type LeadAnalyticsInput,
} from "@/lib/crm/analytics";

describe("[UNIT-ANALYTICS] Cálculo Preciso de SLA (Tempo Real + Histórico)", () => {
  const referenceNow = new Date("2026-09-02T22:00:00.000Z");

  it("[TEST-SLA-UNANSWERED-BREACHED] deve validar que 8 leads sem resposta criados há 30 min retornam slaPercentage: 0 e averageResponseMinutes: 30", () => {
    const leads: LeadAnalyticsInput[] = Array.from({ length: 8 }).map((_, i) => ({
      id: `lead-open-${i + 1}`,
      name: `Cliente ${i + 1}`,
      status: "novo",
      createdAt: new Date(referenceNow.getTime() - 30 * 60000).toISOString(),
      firstContactAt: null,
      lastContactAt: null,
    }));

    // Teste com calculateManagerCockpitMetrics
    const managerMetrics = calculateManagerCockpitMetrics(leads, { now: referenceNow });
    expect(managerMetrics.slaComplianceRate).toBe(0);
    expect(managerMetrics.averageFirstContactMinutes).toBe(30);
    expect(managerMetrics.overdueLeadsCount).toBe(8);
    expect(managerMetrics.bottlenecks?.withoutReturnCount).toBe(8);

    // Teste com calculateCockpitMetrics (utilitário direto)
    // Para testar calculateCockpitMetrics com tempo fixo, usamos leads com timestamps relativos ao Date.now()
    const nowTimestamp = Date.now();
    const liveLeads: LeadAnalyticsInput[] = Array.from({ length: 8 }).map((_, i) => ({
      id: `live-lead-${i + 1}`,
      name: `Cliente Live ${i + 1}`,
      status: "novo",
      createdAt: new Date(nowTimestamp - 30 * 60000).toISOString(),
      firstContactAt: null,
      lastContactAt: null,
    }));

    const cockpitMetrics = calculateCockpitMetrics(liveLeads, 15);
    expect(cockpitMetrics.slaPercentage).toBe(0);
    expect(cockpitMetrics.averageResponseMinutes).toBe(30);
    expect(cockpitMetrics.unansweredLeadsCount).toBe(8);
  });

  it("[TEST-SLA-ANSWERED-ON-TIME] deve retornar 100% de conformidade quando todos os leads forem atendidos em <= 15 min", () => {
    const leads: LeadAnalyticsInput[] = [
      {
        id: "l1",
        status: "atendimento",
        createdAt: new Date(referenceNow.getTime() - 20 * 60000).toISOString(),
        firstContactAt: new Date(referenceNow.getTime() - 16 * 60000).toISOString(), // 4 min
      },
      {
        id: "l2",
        status: "visita",
        createdAt: new Date(referenceNow.getTime() - 40 * 60000).toISOString(),
        firstContactAt: new Date(referenceNow.getTime() - 30 * 60000).toISOString(), // 10 min
      },
    ];

    const metrics = calculateManagerCockpitMetrics(leads, { now: referenceNow });
    expect(metrics.slaComplianceRate).toBe(100);
    expect(metrics.averageFirstContactMinutes).toBe(7); // (4 + 10) / 2 = 7.0
    expect(metrics.overdueLeadsCount).toBe(0);
  });

  it("[TEST-SLA-EMPTY-OR-RECENT] deve retornar 100% quando os leads forem recentes (< 15 min) e nenhum estourou", () => {
    const leads: LeadAnalyticsInput[] = [
      {
        id: "l1",
        status: "novo",
        createdAt: new Date(referenceNow.getTime() - 5 * 60000).toISOString(), // 5 min de espera
        firstContactAt: null,
      },
      {
        id: "l2",
        status: "novo",
        createdAt: new Date(referenceNow.getTime() - 9 * 60000).toISOString(), // 9 min de espera
        firstContactAt: null,
      },
    ];

    const metrics = calculateManagerCockpitMetrics(leads, { now: referenceNow });
    expect(metrics.slaComplianceRate).toBe(100);
    expect(metrics.averageFirstContactMinutes).toBe(7); // (5 + 9) / 2 = 7.0
    expect(metrics.overdueLeadsCount).toBe(0);
  });

  it("[TEST-SLA-WEIGHTED-MIXED] deve calcular a taxa ponderada entre leads atendidos e estourados em aberto", () => {
    const leads: LeadAnalyticsInput[] = [
      // 1 atendido no prazo (6 min)
      {
        id: "l1",
        status: "atendimento",
        createdAt: new Date(referenceNow.getTime() - 20 * 60000).toISOString(),
        firstContactAt: new Date(referenceNow.getTime() - 14 * 60000).toISOString(),
      },
      // 1 atendido atrasado (25 min)
      {
        id: "l2",
        status: "visita",
        createdAt: new Date(referenceNow.getTime() - 50 * 60000).toISOString(),
        firstContactAt: new Date(referenceNow.getTime() - 25 * 60000).toISOString(),
      },
      // 1 estourado em aberto (criado há 40 min sem contato)
      {
        id: "l3",
        status: "novo",
        createdAt: new Date(referenceNow.getTime() - 40 * 60000).toISOString(),
        firstContactAt: null,
      },
      // 1 recente dentro do prazo (criado há 5 min sem contato)
      {
        id: "l4",
        status: "novo",
        createdAt: new Date(referenceNow.getTime() - 5 * 60000).toISOString(),
        firstContactAt: null,
      },
    ];

    // totalAvaliados = 2 atendidos + 1 estourado em aberto = 3
    // noPrazo = 1
    // slaPercentage = (1 / 3) * 100 = 33.3%
    const metrics = calculateManagerCockpitMetrics(leads, { now: referenceNow });
    expect(metrics.slaComplianceRate).toBe(33.3);
    // Tempo médio de resposta dos atendidos = (6 + 25) / 2 = 15.5 min
    expect(metrics.averageFirstContactMinutes).toBe(15.5);
    expect(metrics.overdueLeadsCount).toBe(1);
  });

  it("[TEST-SLA-EMPTY-STORE] deve retornar 100% e 0 min para loja vazia sem leads", () => {
    const metrics = calculateManagerCockpitMetrics([], { now: referenceNow });
    expect(metrics.slaComplianceRate).toBe(100);
    expect(metrics.averageFirstContactMinutes).toBe(0);
    expect(metrics.overdueLeadsCount).toBe(0);
    expect(metrics.sellerRanking).toEqual([]);
  });
});
