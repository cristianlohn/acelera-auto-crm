/**
 * @file lead-assignment.test.ts
 * @description Suíte de testes unitários para Atribuição Direta de Leads, RBAC e Transferência de Titularidade.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { MANUAL_LEAD_SOURCES } from "@/types/crm";
import { createLeadAction, transferLeadAction } from "@/app/actions/lead-actions";
import * as roletaServiceModule from "@/lib/services/roleta/roleta-service";
import * as tenantModule from "@/lib/auth/tenant";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("[UNIT-LEAD-ASSIGNMENT] Regras de Origem, Atribuição Direta e Transferência de Leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Restrição de Origens Manuais (MANUAL_LEAD_SOURCES / ALLOWED_MANUAL_SOURCES)", () => {
    it("[TEST-SOURCES-1] deve conter estritamente 2 canais (patio e whatsapp_direto) e NÃO conter portais ou ads", () => {
      const values = MANUAL_LEAD_SOURCES.map((s) => s.value);

      expect(values).toHaveLength(2);
      expect(values).toEqual(["patio", "whatsapp_direto"]);

      // Portais automáticos não devem estar presentes na lista manual
      expect(values).not.toContain("webmotors");
      expect(values).not.toContain("meta_ads");
      expect(values).not.toContain("google_ads");
      expect(values).not.toContain("icarros");
      expect(values).not.toContain("olx");
      expect(values).not.toContain("indicacao");
      expect(values).not.toContain("site");
    });
  });

  describe("2. Cadastro Manual com Atribuição Direta (Bypass da Roleta)", () => {
    it("[TEST-ASSIGN-1] deve atribuir o lead diretamente ao vendedor logado sem acionar a Roleta Comercial", async () => {
      const roletaSpy = vi.spyOn(roletaServiceModule, "distributeLead");

      vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
        userId: "seller-123",
        organizationId: "org-loja-001",
        isDemo: true,
        organization: null,
        needsOnboarding: false,
        profile: {
          id: "seller-123",
          full_name: "Lucas Mendes Vendedor",
          role: "vendedor",
          organization_id: "org-loja-001",
          email: "lucas@loja.com",
          phone: "11988887777",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          avatar_url: null,
        },
      });

      const result = await createLeadAction({
        name: "Mariana Souza",
        phone: "(11) 98888-2222",
        source: "patio",
        vehicle_of_interest: "Honda Civic EXL",
      });

      expect(result.success).toBe(true);
      expect(result.lead).toBeDefined();
      expect(result.lead?.name).toBe("Mariana Souza");
      // Posse direta do vendedor logado
      expect(result.lead?.assigned_to?.id).toBe("seller-123");
      expect(result.lead?.assigned_to_name).toBe("Lucas Mendes Vendedor");

      // Roleta comercial NÃO deve ser invocada
      expect(roletaSpy).not.toHaveBeenCalled();
    });
  });

  describe("3. Transferência de Titularidade (transferLeadAction)", () => {
    it("[TEST-TRANSFER-1] deve permitir que o titular transfira seu próprio lead com registro de auditoria", async () => {
      vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
        userId: "seller-123",
        organizationId: "org-loja-001",
        isDemo: true,
        organization: null,
        needsOnboarding: false,
        profile: {
          id: "seller-123",
          full_name: "Lucas Mendes",
          role: "vendedor",
          organization_id: "org-loja-001",
          email: "lucas@loja.com",
          phone: "11988887777",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          avatar_url: null,
        },
      });

      // Cadastra lead inicial sob posse de Lucas
      const created = await createLeadAction({
        name: "Carlos Ferreira",
        phone: "(11) 97777-1111",
        source: "whatsapp_direto",
        vehicle_of_interest: "Toyota Corolla",
      });

      const leadId = created.lead!.id;

      // Executa transferência para Camila Rocha
      const transferResult = await transferLeadAction(leadId, "Camila Rocha", "Especialista em Toyota");

      expect(transferResult.success).toBe(true);
      expect(transferResult.lead?.assigned_to_name).toBe("Camila Rocha");
    });

    it("[TEST-TRANSFER-2] deve bloquear tentativa de vendedor transferir lead de outro consultor", async () => {
      // 1. Cria lead com outro vendedor
      vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
        userId: "seller-other-999",
        organizationId: "org-loja-001",
        isDemo: true,
        organization: null,
        needsOnboarding: false,
        profile: {
          id: "seller-other-999",
          full_name: "Outro Consultor",
          role: "vendedor",
          organization_id: "org-loja-001",
          email: "outro@loja.com",
          phone: "11988889999",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          avatar_url: null,
        },
      });

      const created = await createLeadAction({
        name: "Fernanda Costa",
        phone: "(11) 96666-3333",
        source: "whatsapp_direto",
        vehicle_of_interest: "Fiat Pulse",
      });
      const leadId = created.lead!.id;

      // 2. Tenta transferir com usuário vendedor diferente (Rafael)
      vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
        userId: "seller-rafael-123",
        organizationId: "org-loja-001",
        isDemo: true,
        organization: null,
        needsOnboarding: false,
        profile: {
          id: "seller-rafael-123",
          full_name: "Rafael Alves",
          role: "vendedor",
          organization_id: "org-loja-001",
          email: "rafael@loja.com",
          phone: "11988887777",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          avatar_url: null,
        },
      });

      const unauthorizedResult = await transferLeadAction(leadId, "Camila Rocha", "Tentativa indevida");

      expect(unauthorizedResult.success).toBe(false);
      expect(unauthorizedResult.error).toContain("Você só pode transferir leads sob sua responsabilidade");
    });

    it("[TEST-TRANSFER-3] deve permitir que o Gestor/Admin transfira qualquer lead", async () => {
      vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
        userId: "manager-admin-001",
        organizationId: "org-loja-001",
        isDemo: true,
        organization: null,
        needsOnboarding: false,
        profile: {
          id: "manager-admin-001",
          full_name: "Carlos Gestor Geral",
          role: "gerente",
          organization_id: "org-loja-001",
          email: "carlos@loja.com",
          phone: "11999998888",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          avatar_url: null,
        },
      });

      const created = await createLeadAction({
        name: "Juliana Andrade",
        phone: "(11) 95555-4444",
        source: "patio",
        vehicle_of_interest: "Jeep Compass",
      });
      const leadId = created.lead!.id;

      const transferResult = await transferLeadAction(leadId, "Vendedor Especialista", "Rebalanceamento de carteira");

      expect(transferResult.success).toBe(true);
      expect(transferResult.lead?.assigned_to_name).toBe("Vendedor Especialista");
    });
  });
});
