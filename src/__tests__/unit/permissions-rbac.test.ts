/**
 * @file permissions-rbac.test.ts
 * @description Suíte de testes unitários para a Matriz de Permissões (RBAC) e Isolamento de Leads.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  normalizeRole,
  canManageTeam,
  canViewAllLeads,
  canViewExecutiveReports,
  canManageIntegrationsAndBilling,
  isSuperAdmin,
} from "@/lib/permissions";
import { getNavItemsForRole } from "@/components/layout/sidebar";
import {
  getKanbanLeadsAction,
  getKanbanBoardAction,
  resetMemoryKanbanLeads,
} from "@/app/actions/kanban-actions";
import { getLeads } from "@/app/actions/leads";

describe("[UNIT-RBAC] Matriz Central de Permissões (src/lib/permissions.ts)", () => {
  describe("normalizeRole", () => {
    it("deve normalizar variações de vendedor para 'seller'", () => {
      expect(normalizeRole("seller")).toBe("seller");
      expect(normalizeRole("vendedor")).toBe("seller");
      expect(normalizeRole(undefined)).toBe("seller");
      expect(normalizeRole(null)).toBe("seller");
    });

    it("deve normalizar variações de gerente para 'manager'", () => {
      expect(normalizeRole("manager")).toBe("manager");
      expect(normalizeRole("gerente")).toBe("manager");
      expect(normalizeRole("gestor")).toBe("manager");
    });

    it("deve normalizar variações de administrador para 'admin'", () => {
      expect(normalizeRole("admin")).toBe("admin");
      expect(normalizeRole("owner")).toBe("admin");
      expect(normalizeRole("proprietario")).toBe("admin");
      expect(normalizeRole("dono")).toBe("admin");
    });

    it("deve normalizar variações de superadmin para 'superadmin'", () => {
      expect(normalizeRole("superadmin")).toBe("superadmin");
      expect(normalizeRole("super_admin")).toBe("superadmin");
      expect(normalizeRole("super")).toBe("superadmin");
    });
  });

  describe("canManageTeam", () => {
    it("deve bloquear acesso à equipe e roleta para vendedores", () => {
      expect(canManageTeam("seller")).toBe(false);
      expect(canManageTeam("vendedor")).toBe(false);
    });

    it("deve permitir acesso à equipe e roleta para gerente, admin e superadmin", () => {
      expect(canManageTeam("manager")).toBe(true);
      expect(canManageTeam("gerente")).toBe(true);
      expect(canManageTeam("admin")).toBe(true);
      expect(canManageTeam("superadmin")).toBe(true);
    });
  });

  describe("canViewAllLeads", () => {
    it("deve restringir visualização panorâmica de leads para vendedores", () => {
      expect(canViewAllLeads("seller")).toBe(false);
      expect(canViewAllLeads("vendedor")).toBe(false);
    });

    it("deve liberar visão panorâmica de todos os leads para gerente, admin e superadmin", () => {
      expect(canViewAllLeads("manager")).toBe(true);
      expect(canViewAllLeads("admin")).toBe(true);
      expect(canViewAllLeads("superadmin")).toBe(true);
    });
  });

  describe("canViewExecutiveReports", () => {
    it("deve bloquear acesso a relatórios executivos para vendedores", () => {
      expect(canViewExecutiveReports("seller")).toBe(false);
      expect(canViewExecutiveReports("vendedor")).toBe(false);
    });

    it("deve permitir relatórios executivos para gerente, admin e superadmin", () => {
      expect(canViewExecutiveReports("manager")).toBe(true);
      expect(canViewExecutiveReports("gerente")).toBe(true);
      expect(canViewExecutiveReports("admin")).toBe(true);
      expect(canViewExecutiveReports("superadmin")).toBe(true);
    });
  });

  describe("canManageIntegrationsAndBilling", () => {
    it("deve bloquear integrações e faturamento para vendedores e gerentes", () => {
      expect(canManageIntegrationsAndBilling("seller")).toBe(false);
      expect(canManageIntegrationsAndBilling("manager")).toBe(false);
      expect(canManageIntegrationsAndBilling("gerente")).toBe(false);
    });

    it("deve permitir integrações e faturamento para admin e superadmin", () => {
      expect(canManageIntegrationsAndBilling("admin")).toBe(true);
      expect(canManageIntegrationsAndBilling("superadmin")).toBe(true);
    });
  });

  describe("isSuperAdmin", () => {
    it("deve retornar true exclusivamente para o papel superadmin", () => {
      expect(isSuperAdmin("superadmin")).toBe(true);
      expect(isSuperAdmin("admin")).toBe(false);
      expect(isSuperAdmin("manager")).toBe(false);
      expect(isSuperAdmin("seller")).toBe(false);
    });
  });

  describe("getNavItemsForRole", () => {
    it("deve retornar apenas rotas permitidas para Vendedor", () => {
      const items = getNavItemsForRole("seller");
      const hrefs = items.map((i) => i.href);
      expect(hrefs).toContain("/dashboard");
      expect(hrefs).toContain("/dashboard/leads");
      expect(hrefs).toContain("/clients");
      expect(hrefs).toContain("/vehicles");
      expect(hrefs).not.toContain("/dashboard/team");
      expect(hrefs).not.toContain("/reports");
      expect(hrefs).not.toContain("/settings");
      expect(hrefs).not.toContain("/superadmin");
    });

    it("deve incluir '⚡ Painel Superadmin' no topo exclusivamente para Superadmin", () => {
      const items = getNavItemsForRole("superadmin");
      expect(items[0].href).toBe("/superadmin");
      expect(items[0].label).toContain("Painel Superadmin");
    });
  });
});

describe("[UNIT-RBAC] Isolamento de Dados por Papel de Vendedor", () => {
  beforeEach(async () => {
    await resetMemoryKanbanLeads();
  });

  it("Vendedor ('seller' ou 'vendedor') só visualiza leads atribuídos a si", async () => {
    const sellerLeads = await getKanbanLeadsAction(undefined, "seller");

    expect(sellerLeads.length).toBeGreaterThan(0);
    sellerLeads.forEach((lead) => {
      expect(
        lead.assigned_to_name === "Rafael Alves" || lead.assigned_to?.id === "sp-001"
      ).toBe(true);
    });
  });

  it("Gerente e Administrador recebem todos os leads da organização", async () => {
    const adminLeads = await getKanbanLeadsAction(undefined, "admin");
    const managerLeads = await getKanbanLeadsAction(undefined, "manager");

    expect(adminLeads.length).toBe(8);
    expect(managerLeads.length).toBe(8);

    // Contém vendedores múltiplos (ex: Rafael Alves, Juliana Costa, Marcos Ferreira)
    const sellerNames = new Set(adminLeads.map((l) => l.assigned_to_name));
    expect(sellerNames.size).toBeGreaterThan(1);
  });

  it("getKanbanBoardAction agrupa colunas respeitando o filtro de vendedor", async () => {
    const sellerBoard = await getKanbanBoardAction(undefined, "seller");
    const adminBoard = await getKanbanBoardAction(undefined, "admin");

    expect(sellerBoard.totalLeadsCount).toBeLessThan(adminBoard.totalLeadsCount);
    expect(sellerBoard.totalPipelineValue).toBeLessThan(adminBoard.totalPipelineValue);
  });

  it("getLeads() isola leads de vendedores no módulo de clientes/leads", async () => {
    const sellerLeads = await getLeads("seller");
    const adminLeads = await getLeads("admin");

    expect(sellerLeads.length).toBeLessThan(adminLeads.length);
    sellerLeads.forEach((l) => {
      expect(
        l.sellerName === "Rafael Alves" || l.sellerName?.toLowerCase().includes("vendedor")
      ).toBe(true);
    });
  });
});
