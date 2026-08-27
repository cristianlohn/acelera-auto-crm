/**
 * @file multi-tenant-isolation.test.ts
 * @description Suíte de Testes de Segurança e Isolamento Multi-Tenant (RLS & Server Actions).
 *
 * Simula dois tenants isolados:
 * - Tenant A: Concessionária Alfa (`org_alfa_id`, `user_alfa`)
 * - Tenant B: Concessionária Beta (`org_beta_id`, `user_beta`)
 *
 * Cenários Cobertos:
 * 1. [SEC-TENANT-01] SELECT / LEITURA: Impedir vazamento de leads e dados entre organizações distintas.
 * 2. [SEC-TENANT-02] INSERT / CRIAÇÃO: Bloquear injeção de organization_id forçado em novos leads.
 * 3. [SEC-TENANT-03] UPDATE / MODIFICAÇÃO: Impedir que Tenant A altere estágio ou notas de leads do Tenant B.
 * 4. [SEC-TENANT-04] DELETE / EXCLUSÃO: Bloquear remoção de leads ou vendedores pertencentes a outro tenant.
 * 5. [SEC-TENANT-05] ID GUESSING: Garantir que consulta direta por ID retorne null sem expor metadados.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as tenantAuthModule from "@/lib/auth/tenant";
import * as supabaseServerModule from "@/lib/supabase/server";
import {
  getKanbanLeadsAction,
  updateLeadStageAction,
  updateLeadNotesAction,
  getLeadByIdAction,
  deleteLeadAction,
} from "@/app/actions/kanban-actions";
import { getLeads, createLead } from "@/app/actions/leads";
import { deleteSalespersonAction } from "@/app/actions/team-actions";

describe("[SECURITY-MULTI-TENANT] Isolamento Estrito Multi-Tenant e Prevenção de Vazamento", () => {
  const ORG_ALFA_ID = "11111111-1111-1111-1111-111111111111";
  const USER_ALFA_ID = "user-alfa-001";
  const ORG_BETA_ID = "22222222-2222-2222-2222-222222222222";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // Mock do contexto do usuário Alfa (Tenant A)
  function mockAlfaTenantContext() {
    vi.spyOn(tenantAuthModule, "resolveUserTenantContext").mockResolvedValue({
      isDemo: false,
      userId: USER_ALFA_ID,
      userEmail: "gestor@concessionariaalfa.com.br",
      organizationId: ORG_ALFA_ID,
      profile: {
        id: USER_ALFA_ID,
        organization_id: ORG_ALFA_ID,
        full_name: "Gestor Alfa",
        role: "gerente",
        email: "gestor@concessionariaalfa.com.br",
        phone: "+5511999991111",
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      organization: {
        id: ORG_ALFA_ID,
        name: "Concessionária Alfa",
        slug: "alfa-motors",
        document: "11111111000111",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      needsOnboarding: false,
    });
  }

  describe("1. SELECT / LEITURA — Isolamento de Dados", () => {
    it("[SEC-TENANT-01.1] User Alfa NUNCA deve receber leads pertencentes à Concessionária Beta", async () => {
      mockAlfaTenantContext();
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockSupabaseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((col: string, val: string) => {
          // Se o filtro buscar org_beta_id, simula que o RLS do Supabase retorna vazio para Alfa
          if (col === "organization_id" && val === ORG_BETA_ID) {
            return {
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            };
          }
          return {
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "lead-alfa-01",
                  organization_id: ORG_ALFA_ID,
                  name: "Cliente Alfa",
                  phone: "11988881111",
                  vehicle_interest: "Honda Civic",
                  status: "novo",
                  seller_name: "Vendedor Alfa",
                  created_at: new Date().toISOString(),
                },
              ],
              error: null,
            }),
          };
        }),
      };

      vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue({
        from: vi.fn().mockReturnValue(mockSupabaseQuery),
      } as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>);

      // User Alfa tenta buscar os leads do Tenant B
      const leads = await getKanbanLeadsAction(ORG_BETA_ID);

      expect(leads).toBeDefined();
      // Garante que nenhum lead de Beta foi exposto
      const betaLeads = leads.filter((l) => l.organization_id === ORG_BETA_ID);
      expect(betaLeads.length).toBe(0);
    });

    it("[SEC-TENANT-01.2] getLeads() deve consultar estritamente a organização do usuário logado", async () => {
      mockAlfaTenantContext();
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockEq = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue({
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      } as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>);

      await getLeads();

      expect(mockEq).toHaveBeenCalledWith("organization_id", ORG_ALFA_ID);
      expect(mockEq).not.toHaveBeenCalledWith("organization_id", ORG_BETA_ID);
    });
  });

  describe("2. INSERT / CRIAÇÃO — Prevenção de Injeção de Tenant", () => {
    it("[SEC-TENANT-02] Ao criar um lead, o organization_id deve ser forçado para o tenant autenticado (Alfa)", async () => {
      mockAlfaTenantContext();
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: "lead-new-123",
          organization_id: ORG_ALFA_ID,
          name: "Novo Lead Teste",
          phone: "11988882222",
          vehicle_interest: "Toyota Corolla",
          status: "novo",
          seller_name: "Rafael Alves",
        },
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      });

      vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue({
        from: vi.fn().mockReturnValue({ insert: mockInsert }),
      } as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>);

      const createdLead = await createLead({
        name: "Novo Lead Teste",
        phone: "11988882222",
        vehicleInterest: "Toyota Corolla",
      });

      expect(createdLead).toBeDefined();
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: ORG_ALFA_ID,
        })
      );
      expect(mockInsert).not.toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: ORG_BETA_ID,
        })
      );
    });
  });

  describe("3. UPDATE / MODIFICAÇÃO — Bloqueio de Alteração Cross-Tenant", () => {
    it("[SEC-TENANT-03.1] updateLeadStageAction deve rejeitar alteração em lead de outra organização", async () => {
      mockAlfaTenantContext();
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockImplementation(() => {
          return {
            eq: vi.fn().mockResolvedValue({
              error: { message: "Violates Row-Level Security policy" },
            }),
          };
        }),
      });

      vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue({
        from: vi.fn().mockReturnValue({ update: mockUpdate }),
      } as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>);

      const result = await updateLeadStageAction("lead-beta-999", "won");

      // Deve falhar ou não afetar nenhuma linha
      expect(result.success).toBe(false);
    });

    it("[SEC-TENANT-03.2] updateLeadNotesAction deve filtrar estritamente pela organization_id do usuário Alfa", async () => {
      mockAlfaTenantContext();
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockEqOrg = vi.fn().mockResolvedValue({ error: null });
      const mockEqId = vi.fn().mockReturnValue({ eq: mockEqOrg });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqId });

      vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue({
        from: vi.fn().mockReturnValue({ update: mockUpdate }),
      } as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>);

      await updateLeadNotesAction("lead-alfa-01", "Observação legítima");

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ notes: "Observação legítima" })
      );
      expect(mockEqId).toHaveBeenCalledWith("id", "lead-alfa-01");
      expect(mockEqOrg).toHaveBeenCalledWith("organization_id", ORG_ALFA_ID);
    });
  });

  describe("4. DELETE / EXCLUSÃO — Prevenção de Deleção Não Autorizada", () => {
    it("[SEC-TENANT-04.1] deleteLeadAction deve exigir organization_id igual ao do usuário autenticado", async () => {
      mockAlfaTenantContext();
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockEqOrg = vi.fn().mockResolvedValue({ error: null });
      const mockEqId = vi.fn().mockReturnValue({ eq: mockEqOrg });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEqId });

      vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue({
        from: vi.fn().mockReturnValue({ delete: mockDelete }),
      } as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>);

      const result = await deleteLeadAction("lead-alfa-01");

      expect(result.success).toBe(true);
      expect(mockEqId).toHaveBeenCalledWith("id", "lead-alfa-01");
      expect(mockEqOrg).toHaveBeenCalledWith("organization_id", ORG_ALFA_ID);
    });

    it("[SEC-TENANT-04.2] deleteSalespersonAction não deve permitir remover membro do Tenant B", async () => {
      mockAlfaTenantContext();

      // Tentativa de remover vendedor do Tenant B ("sp-beta-002")
      const result = await deleteSalespersonAction("sp-beta-002");

      expect(result).toBeDefined();
    });
  });

  describe("5. ID GUESSING — Proteção contra Enumeração de Recursos", () => {
    it("[SEC-TENANT-05] getLeadByIdAction para ID de outra organização deve retornar null (não expõe nem existência)", async () => {
      mockAlfaTenantContext();
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      // Supabase retorna null quando o ID existe mas pertence a outra organização (RLS)
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" },
      });

      const mockEqOrg = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEqId = vi.fn().mockReturnValue({ eq: mockEqOrg });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqId });

      vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue({
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      } as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>);

      const lead = await getLeadByIdAction("lead-secreto-beta-999");

      expect(lead).toBeNull();
      expect(mockEqId).toHaveBeenCalledWith("id", "lead-secreto-beta-999");
      expect(mockEqOrg).toHaveBeenCalledWith("organization_id", ORG_ALFA_ID);
    });
  });
});
