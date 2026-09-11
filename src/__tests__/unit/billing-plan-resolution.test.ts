/**
 * @file billing-plan-resolution.test.ts
 * @description Suíte de Testes Unitários para a Resolução Determinística e Blindada de Planos do Webhook Asaas.
 *
 * Cenários Testados:
 * 1. Resolução por preço canônico exato (Starter R$ 297,00 e Anual R$ 2.970,00 - NUNCA Enterprise).
 * 2. Resolução por preço canônico exato (Pro R$ 497,00 e Anual R$ 4.970,00 - NUNCA Enterprise).
 * 3. Resolução por preços customizados Enterprise (R$ 897,00, R$ 1.200,00, R$ 1.297,00).
 * 4. Precedência de Identificador/ExternalReference sobre valor.
 * 5. Precedência de Descrição textual explícita sobre valor.
 * 6. Fallback contextual no plano da organização quando o valor for ambíguo.
 */

import { describe, it, expect } from "vitest";
import { resolvePlanFromData } from "@/lib/services/asaas/webhook-service";

describe("[UNIT-BILLING-PLAN-RESOLUTION] Resolução Segura de Planos Asaas", () => {
  describe("1. Mapeamento Exato por Preço e Trava Absoluta contra Enterprise", () => {
    it("R$ 297,00 -> starter", () => {
      const plan = resolvePlanFromData(undefined, undefined, 297);
      expect(plan).toBe("starter");
    });

    it("R$ 2.970,00 -> starter (NÃO PODE SER ENTERPRISE)", () => {
      const plan = resolvePlanFromData(undefined, undefined, 2970);
      expect(plan).toBe("starter");
      expect(plan).not.toBe("enterprise");
    });

    it("R$ 497,00 -> pro", () => {
      const plan = resolvePlanFromData(undefined, undefined, 497);
      expect(plan).toBe("pro");
    });

    it("R$ 4.970,00 -> pro (NÃO PODE SER ENTERPRISE)", () => {
      const plan = resolvePlanFromData(undefined, undefined, 4970);
      expect(plan).toBe("pro");
      expect(plan).not.toBe("enterprise");
    });

    it("R$ 897,00 -> enterprise", () => {
      const plan = resolvePlanFromData(undefined, undefined, 897);
      expect(plan).toBe("enterprise");
    });

    it("R$ 1.200,00 -> enterprise", () => {
      const plan = resolvePlanFromData(undefined, undefined, 1200);
      expect(plan).toBe("enterprise");
    });

    it("R$ 1.297,00 -> enterprise", () => {
      const plan = resolvePlanFromData(undefined, undefined, 1297);
      expect(plan).toBe("enterprise");
    });
  });

  describe("2. Ordem de Prioridade e Precedência de Metadados", () => {
    it("prioriza externalReference explícito mesmo se o valor for diferente", () => {
      // Ex: fatura com desconto promocional de R$ 200 mas com externalReference declarando 'pro'
      const plan = resolvePlanFromData("pro", undefined, 200);
      expect(plan).toBe("pro");

      // Ex: externalReference declarando 'starter' com fatura no valor de R$ 1.200
      const planStarter = resolvePlanFromData("starter", undefined, 1200);
      expect(planStarter).toBe("starter");
    });

    it("prioriza descrição da fatura/assinatura quando externalReference não trouxer o plano", () => {
      const planEnterpriseDesc = resolvePlanFromData(
        undefined,
        "Assinatura Mensal - Plano Enterprise Personalizado",
        297
      );
      expect(planEnterpriseDesc).toBe("enterprise");

      const planStarterDesc = resolvePlanFromData(
        undefined,
        "Plano Starter Anual com Desconto Especial",
        1500
      );
      expect(planStarterDesc).toBe("starter");

      const planProDesc = resolvePlanFromData(
        undefined,
        "Acelera Auto Pro Recorrente",
        897
      );
      expect(planProDesc).toBe("pro");
    });

    it("utiliza o plano da organização (pending_plan ou plan) como fallback contextual", () => {
      // Valor não mapeado (ex: R$ 50 avulso) sem referência explícita nem descrição
      const plan = resolvePlanFromData(undefined, undefined, 50, "starter");
      expect(plan).toBe("starter");

      const planPro = resolvePlanFromData(undefined, undefined, 50, "pro");
      expect(planPro).toBe("pro");
    });
  });
});
