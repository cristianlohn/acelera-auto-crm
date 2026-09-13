/**
 * @file reports-funnel-percentages.test.ts
 * @description Suíte de testes unitários e de integração para:
 * 1. Cálculo de percentuais do funil com base em reachedLeadsCount / totalLeads (calculateStageFunnelMetrics).
 * 2. Direcionamento correto dos CTAs de planos em PricingSection para /register?plan=starter e /register?plan=pro.
 * 3. Validação dos limites de SLA de 15 minutos e regras de pausa do cronômetro na Central de Ajuda.
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  calculateStageFunnelMetrics,
  calculateFunnelPercentage,
  type StageMetric,
} from "@/lib/reports/funnel-metrics";
import { PricingSection } from "@/components/landing/PricingSection";
import { CANONICAL_HELP_TOPICS } from "@/app/(marketing)/ajuda/page";

describe("[UNIT] reports-funnel-percentages & clareza comercial", () => {
  describe("1. calculateStageFunnelMetrics e cálculo de percentuais", () => {
    it("deve calcular a porcentagem com base rigorosa em (reachedLeadsCount / totalLeads) * 100", () => {
      expect(calculateFunnelPercentage(7, 8)).toBe(87.5);
      expect(calculateFunnelPercentage(4, 8)).toBe(50.0);
      expect(calculateFunnelPercentage(1, 8)).toBe(12.5);
      expect(calculateFunnelPercentage(8, 8)).toBe(100.0);
      expect(calculateFunnelPercentage(0, 8)).toBe(0);
      expect(calculateFunnelPercentage(5, 0)).toBe(0);
    });

    it("deve processar lista pré-agregada e retornar a interface StageMetric completa", () => {
      const preAggregated = [
        { stage: "novo", label: "Novos Leads", reachedLeadsCount: 8, currentLeadsCount: 1, totalLeads: 8 },
        { stage: "primeiro_contato", label: "Primeiro Contato", reachedLeadsCount: 7, currentLeadsCount: 2, totalLeads: 8 },
        { stage: "visita", label: "Visita / Test Drive", reachedLeadsCount: 5, currentLeadsCount: 1, totalLeads: 8 },
        { stage: "proposta", label: "Proposta & F&I", reachedLeadsCount: 4, currentLeadsCount: 2, totalLeads: 8 },
        { stage: "fechado", label: "Venda Concluída", reachedLeadsCount: 1, currentLeadsCount: 1, totalLeads: 8 },
        { stage: "perdido", label: "Perdido", reachedLeadsCount: 1, currentLeadsCount: 1, totalLeads: 8 },
      ];

      const metrics: StageMetric[] = calculateStageFunnelMetrics(preAggregated, 8);

      expect(metrics).toHaveLength(6);

      const novo = metrics.find((m) => m.stage === "novo")!;
      expect(novo.reachedLeadsCount).toBe(8);
      expect(novo.currentLeadsCount).toBe(1);
      expect(novo.totalLeads).toBe(8);
      expect(novo.percentage).toBe(100.0);

      const contato = metrics.find((m) => m.stage === "primeiro_contato")!;
      expect(contato.reachedLeadsCount).toBe(7);
      expect(contato.currentLeadsCount).toBe(2);
      expect(contato.totalLeads).toBe(8);
      expect(contato.percentage).toBe(87.5);

      const proposta = metrics.find((m) => m.stage === "proposta")!;
      expect(proposta.reachedLeadsCount).toBe(4);
      expect(proposta.currentLeadsCount).toBe(2);
      expect(proposta.totalLeads).toBe(8);
      expect(proposta.percentage).toBe(50.0);

      const won = metrics.find((m) => m.stage === "fechado")!;
      expect(won.reachedLeadsCount).toBe(1);
      expect(won.currentLeadsCount).toBe(1);
      expect(won.totalLeads).toBe(8);
      expect(won.percentage).toBe(12.5);
    });

    it("deve computar métricas canônicas a partir de uma lista de leads brutos", () => {
      const mockLeads = [
        { status: "novo", stage: "new" },
        { status: "em_atendimento", stage: "first_contact" },
        { status: "em_atendimento", stage: "first_contact" },
        { status: "visita", stage: "visit" },
        { status: "proposta", stage: "proposal" },
        { status: "proposta_fi", stage: "proposal" },
        { status: "concluido", stage: "won" },
        { status: "descarte", stage: "lost" },
      ];

      const metrics = calculateStageFunnelMetrics(mockLeads);

      expect(metrics).toHaveLength(6);

      // Novos Leads (new): 8 entraram no funil (1 parado)
      const newStage = metrics.find((m) => m.stage === "new")!;
      expect(newStage.reachedLeadsCount).toBe(8);
      expect(newStage.currentLeadsCount).toBe(1);
      expect(newStage.totalLeads).toBe(8);
      expect(newStage.percentage).toBe(100.0);

      // Primeiro Contato: 6 alcançaram esta etapa ou avançaram (2 parados)
      const contactStage = metrics.find((m) => m.stage === "first_contact")!;
      expect(contactStage.reachedLeadsCount).toBe(6); // 2 contato + 1 visita + 2 proposta + 1 won = 6
      expect(contactStage.currentLeadsCount).toBe(2);

      // Venda Concluída
      const wonStage = metrics.find((m) => m.stage === "won")!;
      expect(wonStage.reachedLeadsCount).toBe(1);
      expect(wonStage.currentLeadsCount).toBe(1);
      expect(wonStage.percentage).toBe(12.5);
    });
  });

  describe("2. CTAs do PricingSection", () => {
    it("deve apontar o Plano Starter para /register?plan=starter", () => {
      render(React.createElement(PricingSection));

      const starterLink = screen.getByRole("link", { name: /testar grátis por 14 dias/i });
      expect(starterLink).toHaveAttribute("href", "/register?plan=starter");
    });

    it("deve apontar o Plano Pro para /register?plan=pro", () => {
      render(React.createElement(PricingSection));

      const proLink = screen.getByRole("link", { name: /testar plano pro grátis/i });
      expect(proLink).toHaveAttribute("href", "/register?plan=pro");
    });

    it("deve garantir que o botão da demonstração direcione para /dashboard", () => {
      render(React.createElement(PricingSection));

      const demoLink = screen.getByRole("link", { name: /conhecer em detalhes/i });
      expect(demoLink).toHaveAttribute("href", "/dashboard");
    });
  });

  describe("3. Central de Ajuda e SLA de 15 minutos", () => {
    it("deve referenciar 15 minutos de SLA canônico no tópico roleta-2", () => {
      const topic2 = CANONICAL_HELP_TOPICS.find((t) => t.id === "roleta-2");
      expect(topic2).toBeDefined();
      expect(topic2!.answer).toContain("15 minutos");
      expect(topic2!.answer).toContain("entre 5 e 15 minutos");
      expect(topic2!.answer).toContain("acima de 15 minutos sem primeiro contato");
      expect(topic2!.highlight).toContain("15 minutos");
    });

    it("deve conter a explicação transparente de parada do cronômetro no CRM", () => {
      const topic2 = CANONICAL_HELP_TOPICS.find((t) => t.id === "roleta-2");
      expect(topic2).toBeDefined();
      expect(topic2!.answer).toContain(
        "O cronômetro inicia com a chegada do lead e é pausado no CRM ao registrar o primeiro contato ou avançar o card para a etapa 'Primeiro Contato'. A abertura do WhatsApp abre a conversa externa e deve ser registrada no CRM para comprovar o atendimento."
      );
    });

    it("deve atualizar o atraso no cockpit 'Dinheiro na Mesa' para >15 min no tópico roleta-3", () => {
      const topic3 = CANONICAL_HELP_TOPICS.find((t) => t.id === "roleta-3");
      expect(topic3).toBeDefined();
      expect(topic3!.answer).toContain(">15 min");
    });
  });
});
