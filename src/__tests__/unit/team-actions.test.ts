/**
 * @file team-actions.test.ts
 * @description Suíte de Testes Unitários para o Cadastro e Gestão de Vendedores (Zod Validation & Multi-Tenant).
 *
 * Cenários Testados:
 * - [TEST-TEAM-SCHEMA-VALIDATION]: Aceitação de payloads válidos e rejeição de dados incorretos (telefone, nome curto, email inválido).
 * - [TEST-TEAM-PHONE-E164-SANITIZATION]: Normalização e sanitização do telefone para padrão internacional E.164 (+55...).
 * - [TEST-TEAM-MULTI-TENANT-ISOLATION]: Garantia de herança estrita do organization_id do tenant logado.
 * - [TEST-TEAM-ACTION-EXECUTION]: Execução da Server Action createSalespersonAction com FormData e objeto tipado.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSalespersonAction } from "@/app/actions/team-actions";
import { salespersonSchema } from "@/lib/team-schema";
import * as tenantModule from "@/lib/auth/tenant";
import * as supabaseServerModule from "@/lib/supabase/server";

describe("[UNIT-TEAM] Cadastro e Gestão de Vendedores e Membros da Equipe", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("[TEST-TEAM-SCHEMA-VALIDATION] Validação de Schema Zod", () => {
    it("deve aceitar um payload válido e aplicar valores padrão", () => {
      const validPayload = {
        name: "Carlos Eduardo Silveira",
        email: "carlos.silveira@aceleraauto.com.br",
        phone: "(11) 98888-7777",
        role: "seller" as const,
        segment: "all" as const,
        in_roulette: true,
        monthly_goal_units: 15,
      };

      const result = salespersonSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Carlos Eduardo Silveira");
        expect(result.data.email).toBe("carlos.silveira@aceleraauto.com.br");
        expect(result.data.phone).toBe("+5511988887777");
        expect(result.data.in_roulette).toBe(true);
        expect(result.data.monthly_goal_units).toBe(15);
      }
    });

    it("deve rejeitar nomes com menos de 3 caracteres", () => {
      const invalidPayload = {
        name: "Al",
        email: "al@email.com",
        phone: "11988887777",
      };

      const result = salespersonSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("mínimo 3 caracteres");
      }
    });

    it("deve rejeitar e-mails em formato inválido", () => {
      const invalidPayload = {
        name: "Roberto Silva",
        email: "roberto-sem-arroba",
        phone: "11988887777",
      };

      const result = salespersonSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("e-mail inválido");
      }
    });

    it("deve rejeitar telefones com menos de 10 dígitos (sem DDD)", () => {
      const invalidPayload = {
        name: "Roberto Silva",
        email: "roberto@email.com",
        phone: "988887777", // Apenas 9 dígitos
      };

      const result = salespersonSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("telefone ou WhatsApp brasileiro inválido");
      }
    });
  });

  describe("[TEST-TEAM-PHONE-E164-SANITIZATION] Sanitização de Telefone", () => {
    it("deve sanitizar telefone com máscara e prefixar código internacional +55", () => {
      const payload = {
        name: "Mariana Souza",
        email: "mariana@acelera.com",
        phone: "(48) 99123-4567",
      };

      const result = salespersonSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phone).toBe("+5548991234567");
      }
    });
  });

  describe("[TEST-TEAM-MULTI-TENANT-ISOLATION] Isolamento de Tenant na Server Action", () => {
    it("deve associar o novo vendedor ao organization_id do gestor autenticado", async () => {
      vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
        isDemo: false,
        needsOnboarding: false,
        organizationId: "org-loja-ouro-999",
        userId: "manager-user-id",
        userEmail: "gestor@ouro.com.br",
        profile: {
          id: "manager-user-id",
          organization_id: "org-loja-ouro-999",
          full_name: "Gestor Ouro",
          role: "gerente",
          email: "gestor@ouro.com.br",
          phone: "+5511999999999",
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        organization: {
          id: "org-loja-ouro-999",
          name: "Concessionária Ouro",
          slug: "ouro",
          document: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });

      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockSupabaseQuery = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      const mockSupabase = {
        from: vi.fn().mockReturnValue(mockSupabaseQuery),
      };

      vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue(
        mockSupabase as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>
      );

      const actionResult = await createSalespersonAction({
        name: "Fernanda Lima",
        email: "fernanda.lima@ouro.com.br",
        phone: "11988886666",
        role: "seller",
        segment: "new_cars",
        in_roulette: true,
        monthly_goal_units: 20,
      });

      expect(actionResult.success).toBe(true);
      expect(actionResult.member).toBeDefined();
      expect(actionResult.member?.organizationId).toBe("org-loja-ouro-999");
      expect(actionResult.member?.name).toBe("Fernanda Lima");
      expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
      expect(mockSupabaseQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: "org-loja-ouro-999",
          full_name: "Fernanda Lima",
          email: "fernanda.lima@ouro.com.br",
        })
      );
    });
  });

  describe("[TEST-TEAM-ACTION-EXECUTION] Entrada via FormData", () => {
    it("deve processar corretamente uma submissão via FormData nativo", async () => {
      const formData = new FormData();
      formData.set("name", "Bruno Henrique");
      formData.set("email", "bruno@email.com");
      formData.set("phone", "11977778888");
      formData.set("role", "sdr");
      formData.set("segment", "used_cars");
      formData.set("in_roulette", "true");
      formData.set("monthly_goal_units", "10");

      const result = await createSalespersonAction(formData);
      expect(result.success).toBe(true);
      expect(result.member?.name).toBe("Bruno Henrique");
      expect(result.member?.role).toBe("sdr");
      expect(result.member?.segment).toBe("used_cars");
    });
  });
});
