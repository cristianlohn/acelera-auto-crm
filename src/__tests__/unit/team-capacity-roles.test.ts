/**
 * @file team-capacity-roles.test.ts
 * @description Suíte de Testes Unitários para a Função Canônica isSalesRole e Controle de Capacidade da Equipe.
 *
 * Cenários Testados:
 * 1. isSalesRole: retorna true para aliases comerciais ('vendedor', 'vendedora', 'seller', 'consultor', 'consultora').
 * 2. isSalesRole: retorna false para papéis administrativos ('admin', 'gerente', 'diretor', 'gestor', 'manager').
 * 3. Consumo de Vagas: Amanda Souza (vendedora) e Rafael Martins (vendedor) consomem 1 vaga cada.
 * 4. Isolamento Administrativo: Usuário 'admin' ou 'gerente' adicionado à equipe não altera a contagem de vagas comerciais.
 * 5. Cota Starter: 3º vendedor permitido, 4º bloqueado.
 * 6. Cota Pro: 8º vendedor permitido, 9º bloqueado.
 * 7. Cota Enterprise Contratual: max_sellers = 20 (20º vendedor permitido, 21º bloqueado).
 * 8. Cota Enterprise Sob Consulta: max_sellers = null sem flag explícita retorna hasAvailableSlots = false.
 * 9. Cota Enterprise Ilimitada: enterprise_unlimited = true permite cadastro com hasAvailableSlots = true e maxSellers = null.
 */

import { describe, it, expect } from "vitest";
import { isSalesRole } from "@/config/plans";
import { validateTeamCapacityAction } from "@/app/actions/team-actions";
import type { TeamMember } from "@/types/team";

const makeMember = (
  id: string,
  name: string,
  role: string,
  orgId: string = "org-test"
): TeamMember => ({
  id,
  organization_id: orgId,
  name,
  email: `${id}@loja.com.br`,
  phone: "+5547999880000",
  role: role as TeamMember["role"],
  segment: "all",
  in_roulette: true,
  status: "ativo",
  monthly_goal_units: 10,
  current_sales_units: 0,
  avg_sla_minutes: 5.0,
  created_at: new Date().toISOString(),
});

describe("[UNIT-TEAM-CAPACITY-ROLES] Controle Canônico de Papéis de Vendas e Capacidade de Equipe", () => {
  describe("1. Validação da Função Canônica isSalesRole", () => {
    it("deve retornar true para aliases de vendas reconhecidos", () => {
      expect(isSalesRole("vendedor")).toBe(true);
      expect(isSalesRole("vendedora")).toBe(true);
      expect(isSalesRole("seller")).toBe(true);
      expect(isSalesRole("consultor")).toBe(true);
      expect(isSalesRole("consultora")).toBe(true);
      expect(isSalesRole("  VENDEDOR  ")).toBe(true);
      expect(isSalesRole("Vendedora")).toBe(true);
      expect(isSalesRole("SELLER")).toBe(true);
    });

    it("deve retornar false para papéis administrativos ou de gestão", () => {
      expect(isSalesRole("admin")).toBe(false);
      expect(isSalesRole("gerente")).toBe(false);
      expect(isSalesRole("diretor")).toBe(false);
      expect(isSalesRole("gestor")).toBe(false);
      expect(isSalesRole("manager")).toBe(false);
      expect(isSalesRole("owner")).toBe(false);
      expect(isSalesRole("proprietario")).toBe(false);
      expect(isSalesRole(null)).toBe(false);
      expect(isSalesRole(undefined)).toBe(false);
      expect(isSalesRole("")).toBe(false);
    });
  });

  describe("2. Contagem e Consumo de Vagas por Papel", () => {
    it("Amanda Souza (vendedora) e Rafael Martins (vendedor) consomem 1 vaga cada", async () => {
      const team: TeamMember[] = [
        makeMember("mem-1", "Rafael Martins", "vendedor"),
        makeMember("mem-2", "Amanda Souza", "vendedora"),
      ];

      const capacity = await validateTeamCapacityAction(
        "org-test",
        { plan: "starter" },
        team
      );

      // 2 vendedores ativos computados
      expect(capacity.currentCount).toBe(2);
      expect(capacity.maxSellers).toBe(3);
      expect(capacity.hasAvailableSlots).toBe(true);
    });

    it("Usuário admin adicionado à equipe mantém a contagem de vagas de vendedores inalterada", async () => {
      const teamWithSellersOnly: TeamMember[] = [
        makeMember("mem-1", "Rafael Martins", "vendedor"),
        makeMember("mem-2", "Amanda Souza", "vendedora"),
      ];

      const capBefore = await validateTeamCapacityAction(
        "org-test",
        { plan: "starter" },
        teamWithSellersOnly
      );
      expect(capBefore.currentCount).toBe(2);

      const teamWithAdmin: TeamMember[] = [
        ...teamWithSellersOnly,
        makeMember("mem-admin", "Carlos Diretor", "admin"),
        makeMember("mem-manager", "Juliana Gerente", "gerente"),
      ];

      const capAfter = await validateTeamCapacityAction(
        "org-test",
        { plan: "starter" },
        teamWithAdmin
      );

      // Contagem de vendedores permanece rigorosamente 2
      expect(capAfter.currentCount).toBe(2);
      expect(capAfter.hasAvailableSlots).toBe(true);
    });
  });

  describe("3. Limites de Capacidade por Plano (Starter e Pro)", () => {
    it("Starter: 3º vendedor permitido, 4º bloqueado", async () => {
      // 2 vendedores ativos -> 3º é permitido
      const team2 = [
        makeMember("s1", "Vendedor 1", "vendedor"),
        makeMember("s2", "Vendedora 2", "vendedora"),
      ];
      const cap2 = await validateTeamCapacityAction("org-test", { plan: "starter" }, team2);
      expect(cap2.currentCount).toBe(2);
      expect(cap2.maxSellers).toBe(3);
      expect(cap2.hasAvailableSlots).toBe(true);

      // 3 vendedores ativos -> teto atingido, 4º é bloqueado
      const team3 = [
        ...team2,
        makeMember("s3", "Consultor 3", "consultor"),
      ];
      const cap3 = await validateTeamCapacityAction("org-test", { plan: "starter" }, team3);
      expect(cap3.currentCount).toBe(3);
      expect(cap3.maxSellers).toBe(3);
      expect(cap3.hasAvailableSlots).toBe(false);
    });

    it("Pro: 8º vendedor permitido, 9º bloqueado", async () => {
      // 7 vendedores ativos -> 8º é permitido
      const team7 = Array.from({ length: 7 }, (_, i) =>
        makeMember(`pro-${i}`, `Vendedor ${i + 1}`, "vendedor")
      );
      const cap7 = await validateTeamCapacityAction("org-test", { plan: "pro" }, team7);
      expect(cap7.currentCount).toBe(7);
      expect(cap7.maxSellers).toBe(8);
      expect(cap7.hasAvailableSlots).toBe(true);

      // 8 vendedores ativos -> teto atingido, 9º é bloqueado
      const team8 = [
        ...team7,
        makeMember("pro-7", "Vendedor 8", "vendedor"),
      ];
      const cap8 = await validateTeamCapacityAction("org-test", { plan: "pro" }, team8);
      expect(cap8.currentCount).toBe(8);
      expect(cap8.maxSellers).toBe(8);
      expect(cap8.hasAvailableSlots).toBe(false);
    });
  });

  describe("4. Limites de Capacidade Contratual Enterprise", () => {
    it("Enterprise com max_sellers = 20: 20º vendedor permitido, 21º vendedor bloqueado", async () => {
      // 19 vendedores ativos em cota contratual de 20 -> 20º é permitido
      const team19 = Array.from({ length: 19 }, (_, i) =>
        makeMember(`ent-${i}`, `Vendedor ${i + 1}`, "vendedor", "org-enterprise")
      );
      const cap19 = await validateTeamCapacityAction(
        "org-enterprise",
        { plan: "enterprise", max_sellers: 20 },
        team19
      );
      expect(cap19.currentCount).toBe(19);
      expect(cap19.maxSellers).toBe(20);
      expect(cap19.hasAvailableSlots).toBe(true);

      // 20 vendedores ativos -> 20º preencheu a vaga, tentativa do 21º é bloqueada
      const team20 = [
        ...team19,
        makeMember("ent-19", "Vendedor 20", "vendedor", "org-enterprise"),
      ];
      const cap20 = await validateTeamCapacityAction(
        "org-enterprise",
        { plan: "enterprise", max_sellers: 20 },
        team20
      );
      expect(cap20.currentCount).toBe(20);
      expect(cap20.maxSellers).toBe(20);
      expect(cap20.hasAvailableSlots).toBe(false);
    });

    it("Enterprise sem max_sellers e sem flag explícita bloqueia novos cadastros (exige contato comercial)", async () => {
      const team = [makeMember("e1", "Vendedor 1", "vendedor", "org-enterprise")];
      const cap = await validateTeamCapacityAction(
        "org-enterprise",
        { plan: "enterprise", max_sellers: null },
        team
      );
      expect(cap.currentCount).toBe(1);
      expect(cap.maxSellers).toBe(null);
      expect(cap.hasAvailableSlots).toBe(false);
    });

    it("Enterprise com flag explícita enterprise_unlimited concede capacidade ilimitada", async () => {
      const team50 = Array.from({ length: 50 }, (_, i) =>
        makeMember(`ent-${i}`, `Vendedor ${i + 1}`, "vendedor", "org-enterprise")
      );
      const cap = await validateTeamCapacityAction(
        "org-enterprise",
        { plan: "enterprise", max_sellers: null, enterprise_unlimited: true },
        team50
      );
      expect(cap.currentCount).toBe(50);
      expect(cap.maxSellers).toBe(null);
      expect(cap.hasAvailableSlots).toBe(true);
    });
  });
});
