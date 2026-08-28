/**
 * @file team-invite-email.test.ts
 * @description Suíte de Testes Unitários para o Disparo Automático de Convite por E-mail (Supabase SMTP),
 * Geração de Link de Contingência, Reenvio e Integração com UI/Server Actions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  inviteTeamMemberAction,
  resendInviteEmailAction,
  createSalespersonAction,
  inviteSellerAction,
} from "@/app/actions/team-actions";
import { inviteTeamMember } from "@/app/actions/team";
import * as tenantModule from "@/lib/auth/tenant";
import * as supabaseServerModule from "@/lib/supabase/server";
import * as supabaseAdminModule from "@/lib/supabase/admin";

describe("[UNIT-TEAM-INVITE-EMAIL] Disparo Automático de Convite SMTP & Contingência", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("[UT-INV.1] Deve disparar inviteUserByEmail com redirectTo e metadata corretos em ambiente configurado", async () => {
    vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
      isDemo: false,
      needsOnboarding: false,
      organizationId: "org-alpha-123",
      userId: "manager-id",
      userEmail: "manager@alpha.com.br",
      profile: null,
      organization: null,
    });

    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

    const mockInviteUserByEmail = vi.fn().mockResolvedValue({
      data: { user: { id: "user-vendedor-456", email: "pedro@alpha.com.br" } },
      error: null,
    });

    const mockGenerateLink = vi.fn().mockResolvedValue({
      data: { properties: { action_link: "https://aceleraauto.com.br/auth/update-password?token=inv_999" } },
      error: null,
    });

    const mockUpsert = vi.fn().mockResolvedValue({ error: null });

    const mockAdminSupabase = {
      auth: {
        admin: {
          inviteUserByEmail: mockInviteUserByEmail,
          generateLink: mockGenerateLink,
        },
      },
      from: vi.fn().mockReturnValue({
        upsert: mockUpsert,
      }),
    };

    vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
      mockAdminSupabase as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
    );

    const result = await inviteTeamMemberAction({
      name: "Pedro Henrique",
      email: "pedro@alpha.com.br",
      phone: "(11) 98888-1234",
      role: "seller",
      segment: "new_cars",
      in_roulette: true,
      monthly_goal_units: 12,
    });

    expect(result.success).toBe(true);
    expect(result.emailSent).toBe(true);
    expect(result.fallbackInviteLink).toBe("https://aceleraauto.com.br/auth/update-password?token=inv_999");
    expect(result.member?.id).toBe("user-vendedor-456");

    expect(mockInviteUserByEmail).toHaveBeenCalledWith(
      "pedro@alpha.com.br",
      expect.objectContaining({
        redirectTo: expect.stringContaining("/auth/update-password"),
        data: expect.objectContaining({
          full_name: "Pedro Henrique",
          role: "seller",
        }),
      })
    );

    expect(mockGenerateLink).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "invite",
        email: "pedro@alpha.com.br",
        options: expect.objectContaining({
          redirectTo: expect.stringContaining("/auth/update-password"),
        }),
      })
    );

    expect(mockAdminSupabase.from).toHaveBeenCalledWith("profiles");
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "user-vendedor-456",
        organization_id: "org-alpha-123",
        full_name: "Pedro Henrique",
        email: "pedro@alpha.com.br",
        role: "vendedor",
      }),
      { onConflict: "id" }
    );
  });

  it("[UT-INV.2] Deve gerar link de contingência em modo Demonstração com sucesso imediato", async () => {
    vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
      isDemo: true,
      needsOnboarding: false,
      organizationId: "demo-org",
      userId: "demo-user",
      userEmail: "demo@acelera.com",
      profile: null,
      organization: null,
    });

    const result = await createSalespersonAction({
      name: "Lucas Pereira",
      email: "lucas@concessionaria.com.br",
      phone: "11977771234",
      role: "seller",
    });

    expect(result.success).toBe(true);
    expect(result.emailSent).toBe(true);
    expect(result.fallbackInviteLink).toContain("/auth/update-password?token=demo_");
    expect(result.fallbackInviteLink).toContain("lucas%40concessionaria.com.br");
    expect(result.member?.name).toBe("Lucas Pereira");
  });

  it("[UT-INV.3] Deve reenviar e-mail de convite via resendInviteEmailAction", async () => {
    vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
      isDemo: false,
      needsOnboarding: false,
      organizationId: "org-beta-456",
      userId: "manager-id",
      userEmail: "manager@beta.com.br",
      profile: null,
      organization: null,
    });

    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

    const mockInviteUserByEmail = vi.fn().mockResolvedValue({
      data: { user: { id: "resend-user-id" } },
      error: null,
    });

    const mockGenerateLink = vi.fn().mockResolvedValue({
      data: { properties: { action_link: "https://aceleraauto.com.br/auth/update-password?token=resend_link" } },
      error: null,
    });

    const mockAdminSupabase = {
      auth: {
        admin: {
          inviteUserByEmail: mockInviteUserByEmail,
          generateLink: mockGenerateLink,
        },
      },
    };

    vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
      mockAdminSupabase as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
    );

    const resendResult = await resendInviteEmailAction("vendedor@beta.com.br", "Vendedor Beta", "seller");

    expect(resendResult.success).toBe(true);
    expect(resendResult.emailSent).toBe(true);
    expect(resendResult.fallbackInviteLink).toBe("https://aceleraauto.com.br/auth/update-password?token=resend_link");
    expect(mockInviteUserByEmail).toHaveBeenCalledWith(
      "vendedor@beta.com.br",
      expect.objectContaining({
        data: expect.objectContaining({
          full_name: "Vendedor Beta",
          role: "seller",
        }),
      })
    );
  });

  it("[UT-INV.4] Deve convidar membro em inviteTeamMember (src/app/actions/team.ts) e retornar dados enriquecidos", async () => {
    vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
      isDemo: true,
      needsOnboarding: false,
      organizationId: "org-001",
      userId: "demo-admin",
      userEmail: "admin@autoprime.com.br",
      profile: null,
      organization: null,
    });

    const inviteResult = await inviteTeamMember({
      fullName: "Carla Mendes",
      email: "carla.mendes@autoprime.com.br",
      phone: "11988889999",
      role: "vendedor",
    });

    expect(inviteResult.success).toBe(true);
    expect(inviteResult.emailSent).toBe(true);
    expect(inviteResult.fallbackInviteLink).toBeDefined();
    expect(inviteResult.member?.fullName).toBe("Carla Mendes");
  });

  it("[UT-INV.5] Deve rejeitar e-mails inválidos e campos obrigatórios vazios com mensagens claras", async () => {
    const invalidResult = await inviteTeamMemberAction({
      name: "",
      email: "invalido",
      phone: "123",
    });

    expect(invalidResult.success).toBe(false);
    expect(invalidResult.error).toBeDefined();
  });

  describe("inviteSellerAction", () => {
    it("[UT-INV.6] Deve verificar se o usuário já existe e disparar convite com sucesso", async () => {
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockInviteUserByEmail = vi.fn().mockResolvedValue({
        data: { user: { id: "seller-new-123", email: "vendedor@loja.com.br" } },
        error: null,
      });

      const mockAdminSupabase = {
        auth: {
          admin: {
            inviteUserByEmail: mockInviteUserByEmail,
          },
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      };

      vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
        mockAdminSupabase as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
      );

      const result = await inviteSellerAction({
        fullName: "Novo Vendedor",
        email: "vendedor@loja.com.br",
        phone: "(11) 98888-7777",
        role: "seller",
      });

      expect(result.success).toBe(true);
      expect(mockInviteUserByEmail).toHaveBeenCalledWith(
        "vendedor@loja.com.br",
        expect.objectContaining({
          data: expect.objectContaining({
            full_name: "Novo Vendedor",
            phone: "11988887777",
            role: "seller",
          }),
        })
      );
    });

    it("[UT-INV.7] Deve rejeitar convite se o usuário já existir no banco", async () => {
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockAdminSupabase = {
        auth: {
          admin: {
            inviteUserByEmail: vi.fn(),
          },
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: "existing-user-1", full_name: "Existente" },
                error: null,
              }),
            }),
          }),
        }),
      };

      vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
        mockAdminSupabase as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
      );

      const result = await inviteSellerAction({
        fullName: "Usuário Duplicado",
        email: "duplicado@loja.com.br",
        phone: "(11) 98888-7777",
        role: "seller",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("duplicado@loja.com.br");
      expect(result.error).toContain("já possui cadastro");
    });

    it("[UT-INV.8] Deve capturar erro retornado pelo Supabase inviteUserByEmail", async () => {
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockAdminSupabase = {
        auth: {
          admin: {
            inviteUserByEmail: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "SMTP rate limit exceeded" },
            }),
          },
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      };

      vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
        mockAdminSupabase as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
      );

      const result = await inviteSellerAction({
        fullName: "Teste Falha SMTP",
        email: "smtp.falha@loja.com.br",
        phone: "(11) 98888-7777",
        role: "seller",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("SMTP rate limit exceeded");
    });
  });
});
