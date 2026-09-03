/**
 * @file analytics-pipeline.test.ts
 * @description Suíte de testes unitários para o cálculo estrito do Dinheiro na Mesa (Pipeline Total e Valor em Risco).
 */

import { describe, it, expect } from "vitest";
import {
  calculateManagerCockpitMetrics,
  estimateLeadVehicleValue,
  calculatePipelineTotal,
  type LeadAnalyticsInput,
} from "@/lib/crm/analytics";

describe("[UNIT-ANALYTICS-PIPELINE] Cálculo Estrito do Pipeline Total e Prevenção de Valor Fantasma", () => {
  it("[TEST-PIPELINE-1] uma lista de 10 leads com estimatedValue 0 deve resultar em pipeline total 0 e valor em risco 0", () => {
    const leadsWithZeroValue: LeadAnalyticsInput[] = Array.from({ length: 10 }, (_, i) => ({
      id: `lead-zero-${i}`,
      name: `Cliente Teste ${i}`,
      phone: "11988887777",
      status: "novo",
      sellerName: "Rafael Alves",
      vehicleInterest: "Interesse Geral",
      estimatedValue: 0,
      createdAt: new Date(Date.now() - 3600000).toISOString(), // Criado há 1h (SLA estourado)
    }));

    const metrics = calculateManagerCockpitMetrics(leadsWithZeroValue, { defaultTicket: 0 });

    expect(metrics.totalPipelineValue).toBe(0);
    expect(metrics.valueAtRisk).toBe(0);
    expect(metrics.totalActiveLeads).toBe(10);
    expect(metrics.overdueLeadsCount).toBe(10);
  });

  it("[TEST-PIPELINE-2] quando os leads possuem valores vinculados (veículo do estoque), o pipeline reflete a soma exata", () => {
    const leadsWithValues: LeadAnalyticsInput[] = [
      {
        id: "lead-1",
        name: "Carlos Ferreira",
        phone: "11988881111",
        status: "atendimento",
        sellerName: "Rafael Alves",
        vehicleInterest: "Honda Civic EXL 2023",
        estimatedValue: 149900,
        createdAt: new Date().toISOString(),
        firstContactAt: new Date().toISOString(),
      },
      {
        id: "lead-2",
        name: "Mariana Souza",
        phone: "11988882222",
        status: "proposta",
        sellerName: "Lucas Mendes",
        vehicleInterest: "Toyota Corolla Cross 2024",
        estimatedValue: 189900,
        createdAt: new Date().toISOString(),
        firstContactAt: new Date().toISOString(),
      },
      {
        id: "lead-3",
        name: "Fernanda Costa",
        phone: "11988883333",
        status: "novo",
        sellerName: "Camila Rocha",
        vehicleInterest: "Jeep Compass Longitude",
        estimatedValue: 185000,
        createdAt: new Date(Date.now() - 3600000).toISOString(), // SLA estourado
        // Sem primeiro contato
      },
    ];

    const metrics = calculateManagerCockpitMetrics(leadsWithValues, { defaultTicket: 0 });

    const expectedTotal = 149900 + 189900 + 185000;
    expect(metrics.totalPipelineValue).toBe(expectedTotal);
    // Apenas o lead 3 estourou SLA
    expect(metrics.valueAtRisk).toBe(185000);
    expect(metrics.overdueLeadsCount).toBe(1);
    expect(metrics.totalActiveLeads).toBe(3);
  });

  it("[TEST-PIPELINE-3] estimateLeadVehicleValue respeita estimatedValue: 0 e não gera valor fantasma", () => {
    const leadWithZeroValue: LeadAnalyticsInput = {
      name: "João Silva",
      status: "novo",
      vehicleInterest: "Civic 2020",
      estimatedValue: 0,
    };

    // Quando estimatedValue é 0, não gera valor fantasma
    const valueInRealStore = estimateLeadVehicleValue(leadWithZeroValue, 0);
    expect(valueInRealStore).toBe(0);

    const leadWithoutExplicitValue: LeadAnalyticsInput = {
      name: "João Silva",
      status: "novo",
      vehicleInterest: "Civic 2020",
    };

    // Quando não especificado, infere a estimativa do modelo
    const valueInDemo = estimateLeadVehicleValue(leadWithoutExplicitValue, 140000);
    expect(valueInDemo).toBe(145000); // Tabela do Civic
  });

  it("[TEST-PIPELINE-4] calculatePipelineTotal soma estritamente leads em aberto e retorna 0 para lista vazia", () => {
    expect(calculatePipelineTotal([])).toBe(0);

    const leads = [
      { status: "novo", estimated_value: 120000 },
      { status: "proposta", estimatedValue: 180000 },
      { status: "won", estimated_value: 200000 }, // Ignorado
      { status: "lost", estimated_value: 90000 }, // Ignorado
    ];

    expect(calculatePipelineTotal(leads)).toBe(300000);
  });
});

