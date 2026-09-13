/**
 * @file team-capacity-additional-seats.test.ts
 * @description Suíte de Testes Unitários para a Função Canônica calculateEffectiveSellerLimit
 * e Gestão de Vagas Adicionais / Capacidade Efetiva da Equipe (Fase 1).
 *
 * Cenários Testados:
 * 1. calculateEffectiveSellerLimit - Starter:
 *    - Base (sem extras): 3
 *    - Base + 1 extra: 4
 *    - Base + 3 extras: 6
 * 2. calculateEffectiveSellerLimit - Pro:
 *    - Base (sem extras): 8
 *    - Base + 2 extras: 10
 * 3. calculateEffectiveSellerLimit - Enterprise:
 *    - Enterprise com max_sellers = 15 + 5 extras: 20
 *    - Enterprise sem teto (max_sellers = null) e sem flags: null (sob consulta)
 *    - Enterprise ilimitado (enterprise_unlimited: true): null independentemente de extras (ex: 5 extras -> null)
 *    - Enterprise ilimitado (unlimited_sellers: true): null independentemente de extras
 * 4. calculateEffectiveSellerLimit - Resiliência e Defensividade:
 *    - Org nula ou indefinida: fallback para Starter base (3)
 *    - Valores negativos em extra_sellers_count (ex: -3): normalizados para 0
 * 5. validateTeamCapacityAction - Metadados e Controle de Vagas Extras:
 *    - Starter com 1 vaga extra (teto 4): 3 vendedores (remainingSlots = 1, isLimitReached = false, hasAvailableSlots = true)
 *    - Starter com 1 vaga extra (teto 4): 4 vendedores (remainingSlots = 0, isLimitReached = true, hasAvailableSlots = false)
 *    - Pro com 2 vagas extras (teto 10): 8 vendedores (remainingSlots = 2), 10 vendedores (remainingSlots = 0, isLimitReached = true)
 *    - canAddExtra: true para Starter e Pro, false para Enterprise
 * 6. Isenção Rigorosa de Gestores:
 *    - Gestores (admin, gerente, diretor, gestor) NÃO consomem vagas da cota base nem das vagas extras.
 *    - exemptMembersCount reflete os membros administrativos ativos.
 */

import { describe, it, expect } from "vitest";
import { calculateEffectiveSellerLimit } from "@/lib/team-data";
import { validateTeamCapacityAction } from "@/app/actions/team-actions";
import type { TeamMember } from "@/types/team";

const makeMember = (
  id: string,
  name: string,
  role: string,
  orgId: string = "org-test",
  status: TeamMember["status"] = "ativo"
): TeamMember => ({
  id,
  organization_id: orgId,
  name,
  email: `${id}@concessionaria.com.br`,
  phone: "+5547999880000",
  role: role as TeamMember["role"],
  segment: "all",
  in_roulette: true,
  status,
  monthly_goal_units: 10,
  current_sales_units: 0,
  avg_sla_minutes: 5.0,
  created_at: new Date().toISOString(),
});

describe("[UNIT-TEAM-CAPACITY-ADDITIONAL-SEATS] Suporte Canônico a Assentos Adicionais de Vendedores", () => {
  describe("1. Função Pura calculateEffectiveSellerLimit - Plano Starter", () => {
    it("deve retornar 3 para o plano Starter base (sem assentos extras)", () => {
      expect(calculateEffectiveSellerLimit({ plan: "starter" })).toBe(3);
      expect(calculateEffectiveSellerLimit({ plan: "starter", extra_sellers_count: 0 })).toBe(3);
      expect(calculateEffectiveSellerLimit({ plan: "STARTER", extra_sellers_count: null })).toBe(3);
    });

    it("deve retornar 4 para o plano Starter com 1 assento extra", () => {
      expect(calculateEffectiveSellerLimit({ plan: "starter", extra_sellers_count: 1 })).toBe(4);
    });

    it("deve retornar 6 para o plano Starter com 3 assentos extras", () => {
      expect(calculateEffectiveSellerLimit({ plan: "starter", extra_sellers_count: 3 })).toBe(6);
    });
  });

  describe("2. Função Pura calculateEffectiveSellerLimit - Plano Pro", () => {
    it("deve retornar 8 para o plano Pro base (sem assentos extras)", () => {
      expect(calculateEffectiveSellerLimit({ plan: "pro" })).toBe(8);
      expect(calculateEffectiveSellerLimit({ plan: "pro", extra_sellers_count: 0 })).toBe(8);
      expect(calculateEffectiveSellerLimit({ plan: "PRO", extra_sellers_count: null })).toBe(8);
    });

    it("deve retornar 10 para o plano Pro com 2 assentos extras", () => {
      expect(calculateEffectiveSellerLimit({ plan: "pro", extra_sellers_count: 2 })).toBe(10);
    });
  });

  describe("3. Função Pura calculateEffectiveSellerLimit - Plano Enterprise", () => {
    it("deve retornar 20 para Enterprise com max_sellers = 15 e 5 extras contratados", () => {
      expect(
        calculateEffectiveSellerLimit({
          plan: "enterprise",
          max_sellers: 15,
          extra_sellers_count: 5,
        })
      ).toBe(20);
    });

    it("deve retornar null para Enterprise sem max_sellers definido (sob consulta / fallback ilimitado)", () => {
      expect(
        calculateEffectiveSellerLimit({
          plan: "enterprise",
          max_sellers: null,
          extra_sellers_count: 2,
        })
      ).toBeNull();

      expect(
        calculateEffectiveSellerLimit({
          plan: "enterprise",
          max_sellers: undefined,
        })
      ).toBeNull();
    });

    it("deve retornar null para Enterprise ilimitado (enterprise_unlimited = true), independentemente de assentos extras", () => {
      expect(
        calculateEffectiveSellerLimit({
          plan: "enterprise",
          max_sellers: 15,
          extra_sellers_count: 5,
          enterprise_unlimited: true,
        })
      ).toBeNull();

      expect(
        calculateEffectiveSellerLimit({
          plan: "enterprise",
          extra_sellers_count: 10,
          enterprise_unlimited: true,
        })
      ).toBeNull();
    });

    it("deve retornar null para Enterprise com flag unlimited_sellers = true", () => {
      expect(
        calculateEffectiveSellerLimit({
          plan: "enterprise",
          max_sellers: 20,
          extra_sellers_count: 5,
          unlimited_sellers: true,
        })
      ).toBeNull();
    });
  });

  describe("4. Defensividade e Normalização de Entradas", () => {
    it("deve retornar limite do Starter (3) para entrada nula ou vazia", () => {
      expect(calculateEffectiveSellerLimit(null)).toBe(3);
      expect(calculateEffectiveSellerLimit(undefined)).toBe(3);
      expect(calculateEffectiveSellerLimit({})).toBe(3);
    });

    it("deve normalizar valores negativos de extra_sellers_count para 0", () => {
      expect(calculateEffectiveSellerLimit({ plan: "starter", extra_sellers_count: -3 })).toBe(3);
      expect(calculateEffectiveSellerLimit({ plan: "pro", extra_sellers_count: -1 })).toBe(8);
      expect(
        calculateEffectiveSellerLimit({ plan: "enterprise", max_sellers: 10, extra_sellers_count: -5 })
      ).toBe(10);
    });
  });

  describe("5. Integração com validateTeamCapacityAction (Metadados de Vagas Extras)", () => {
    it("Starter + 1 extra: permite 3º vendedor (1 restante) e bloqueia no 4º vendedor", async () => {
      const team3: TeamMember[] = [
        makeMember("s1", "Vendedor 1", "vendedor"),
        makeMember("s2", "Vendedora 2", "vendedora"),
        makeMember("s3", "Consultor 3", "consultor"),
      ];

      const cap3 = await validateTeamCapacityAction(
        "org-test",
        { plan: "starter", extra_sellers_count: 1 },
        team3
      );

      expect(cap3.baseLimit).toBe(3);
      expect(cap3.extraSellersCount).toBe(1);
      expect(cap3.effectiveLimit).toBe(4);
      expect(cap3.currentSalesCount).toBe(3);
      expect(cap3.remainingSlots).toBe(1);
      expect(cap3.isLimitReached).toBe(false);
      expect(cap3.hasAvailableSlots).toBe(true);
      expect(cap3.canAddExtra).toBe(true);

      // 4º vendedor preenche a vaga extra
      const team4 = [...team3, makeMember("s4", "Vendedor 4", "seller")];
      const cap4 = await validateTeamCapacityAction(
        "org-test",
        { plan: "starter", extra_sellers_count: 1 },
        team4
      );

      expect(cap4.effectiveLimit).toBe(4);
      expect(cap4.currentSalesCount).toBe(4);
      expect(cap4.remainingSlots).toBe(0);
      expect(cap4.isLimitReached).toBe(true);
      expect(cap4.hasAvailableSlots).toBe(false);
    });

    it("Pro + 2 extras: total 10 vagas, com 8 vendedores restam 2 vagas", async () => {
      const team8 = Array.from({ length: 8 }, (_, i) =>
        makeMember(`pro-${i}`, `Vendedor ${i + 1}`, "vendedor")
      );

      const cap8 = await validateTeamCapacityAction(
        "org-test",
        { plan: "pro", extra_sellers_count: 2 },
        team8
      );

      expect(cap8.baseLimit).toBe(8);
      expect(cap8.extraSellersCount).toBe(2);
      expect(cap8.effectiveLimit).toBe(10);
      expect(cap8.currentSalesCount).toBe(8);
      expect(cap8.remainingSlots).toBe(2);
      expect(cap8.isLimitReached).toBe(false);
      expect(cap8.hasAvailableSlots).toBe(true);
      expect(cap8.canAddExtra).toBe(true);

      // Com 10 vendedores -> limite atingido
      const team10 = [
        ...team8,
        makeMember("pro-8", "Vendedor 9", "vendedor"),
        makeMember("pro-9", "Vendedor 10", "vendedor"),
      ];

      const cap10 = await validateTeamCapacityAction(
        "org-test",
        { plan: "pro", extra_sellers_count: 2 },
        team10
      );

      expect(cap10.currentSalesCount).toBe(10);
      expect(cap10.remainingSlots).toBe(0);
      expect(cap10.isLimitReached).toBe(true);
      expect(cap10.hasAvailableSlots).toBe(false);
    });

    it("Enterprise com max_sellers = 15 + 5 extras: total 20 vagas", async () => {
      const team19 = Array.from({ length: 19 }, (_, i) =>
        makeMember(`ent-${i}`, `Vendedor ${i + 1}`, "vendedor")
      );

      const cap19 = await validateTeamCapacityAction(
        "org-test",
        { plan: "enterprise", max_sellers: 15, extra_sellers_count: 5 },
        team19
      );

      expect(cap19.baseLimit).toBe(15);
      expect(cap19.extraSellersCount).toBe(5);
      expect(cap19.effectiveLimit).toBe(20);
      expect(cap19.currentSalesCount).toBe(19);
      expect(cap19.remainingSlots).toBe(1);
      expect(cap19.isLimitReached).toBe(false);
      expect(cap19.hasAvailableSlots).toBe(true);
      expect(cap19.canAddExtra).toBe(false); // Enterprise não utiliza fluxo padrão de assentos extras
    });

    it("Enterprise Ilimitado com extras: mantém capacidade infinita", async () => {
      const team25 = Array.from({ length: 25 }, (_, i) =>
        makeMember(`ent-${i}`, `Vendedor ${i + 1}`, "vendedor")
      );

      const cap = await validateTeamCapacityAction(
        "org-test",
        { plan: "enterprise", enterprise_unlimited: true, extra_sellers_count: 5 },
        team25
      );

      expect(cap.baseLimit).toBeNull();
      expect(cap.effectiveLimit).toBeNull();
      expect(cap.remainingSlots).toBeNull();
      expect(cap.isLimitReached).toBe(false);
      expect(cap.hasAvailableSlots).toBe(true);
      expect(cap.canAddExtra).toBe(false);
    });
  });

  describe("6. Isenção Rigorosa de Cargos de Gestão (Admin / Gerente / Diretor)", () => {
    it("não consome assentos da cota base nem dos assentos extras", async () => {
      // 3 vendedores em Starter + 1 extra (capacidade total = 4)
      const sellers: TeamMember[] = [
        makeMember("s1", "Vendedor 1", "vendedor"),
        makeMember("s2", "Vendedor 2", "vendedor"),
        makeMember("s3", "Vendedor 3", "vendedor"),
      ];

      // Adicionando 4 cargos de gestão
      const mixedTeam: TeamMember[] = [
        ...sellers,
        makeMember("m1", "Carlos Admin", "admin"),
        makeMember("m2", "Juliana Gerente", "gerente"),
        makeMember("m3", "Roberto Diretor", "diretor"),
        makeMember("m4", "Fernanda Gestora", "gestor"),
      ];

      const cap = await validateTeamCapacityAction(
        "org-test",
        { plan: "starter", extra_sellers_count: 1 },
        mixedTeam
      );

      // Apenas os 3 vendedores foram computados na cota comercial
      expect(cap.currentSalesCount).toBe(3);
      expect(cap.exemptMembersCount).toBe(4);
      expect(cap.effectiveLimit).toBe(4);
      expect(cap.remainingSlots).toBe(1);
      expect(cap.isLimitReached).toBe(false);
      expect(cap.hasAvailableSlots).toBe(true);
    });
  });
});
