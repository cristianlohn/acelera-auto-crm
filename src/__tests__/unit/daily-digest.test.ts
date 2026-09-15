/**
 * @file daily-digest.test.ts
 * @description Suíte de testes unitários para o motor do Resumo Diário (Daily Digest),
 * template de e-mail, integração com Resend, Server Action e rota de cron segura.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  compileDailyDigestMetrics,
  generateDailyDigestHtml,
  sendDailyDigestEmail,
  type DailyDigestMetrics,
} from "@/lib/services/email/daily-digest-service";
import { GET as cronHandler } from "@/app/api/cron/daily-digest/route";
import { sendTestDailyDigestAction } from "@/app/actions/daily-digest-actions";
import * as tenantModule from "@/lib/auth/tenant";
import * as supabaseServerModule from "@/lib/supabase/server";
import * as supabaseAdminModule from "@/lib/supabase/admin";

describe("[UNIT-DAILY-DIGEST] Motor do Resumo Diário e Notificações", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("compileDailyDigestMetrics", () => {
    it("deve retornar métricas simuladas em modo demo", async () => {
      const metrics = await compileDailyDigestMetrics("org-demo", { isDemo: true });

      expect(metrics).toEqual({
        newLeadsCount: 8,
        stalledLeadsCount: 2,
        wonDealsCount: 3,
        slaComplianceRate: 88,
      });
    });

    it("deve calcular métricas reais das últimas 24h a partir do banco", async () => {
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
      const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString();
      const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString();
      const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();

      const mockLeads = [
        // Lead 1: criado há 2h em 'novo' (> 15m) -> novo lead + lead parado
        {
          id: "lead-1",
          status: "novo",
          created_at: twoHoursAgo,
          updated_at: twoHoursAgo,
          sla_deadline: null,
        },
        // Lead 2: criado há 5h, fechado há 1h -> novo lead + venda ganha
        {
          id: "lead-2",
          status: "fechado",
          created_at: fiveHoursAgo,
          updated_at: oneHourAgo,
          sla_deadline: null,
        },
        // Lead 3: criado há 3 dias -> não entra no contador de novos das 24h
        {
          id: "lead-3",
          status: "atendimento",
          created_at: threeDaysAgo,
          updated_at: threeDaysAgo,
          sla_deadline: null,
        },
      ];

      const mockAdmin = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockLeads, error: null }),
          }),
        }),
      };

      vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
        mockAdmin as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
      );

      const metrics = await compileDailyDigestMetrics("org-real-123");

      expect(metrics.newLeadsCount).toBe(2);
      expect(metrics.wonDealsCount).toBe(1);
      expect(metrics.stalledLeadsCount).toBe(1);
      expect(metrics.slaComplianceRate).toBeGreaterThanOrEqual(0);
      expect(metrics.slaComplianceRate).toBeLessThanOrEqual(100);
    });
  });

  describe("generateDailyDigestHtml", () => {
    it("deve gerar template HTML responsivo com dados dinâmicos e CTA", () => {
      const metrics: DailyDigestMetrics = {
        newLeadsCount: 12,
        stalledLeadsCount: 3,
        wonDealsCount: 5,
        slaComplianceRate: 92,
      };

      const html = generateDailyDigestHtml({
        recipientName: "Carlos Silva",
        storeName: "Auto Prime Motors",
        metrics,
        dateStr: "15/09/2026",
        crmUrl: "https://aceleraautocrm.com.br/dashboard",
      });

      expect(html).toContain("Carlos Silva");
      expect(html).toContain("Auto Prime Motors");
      expect(html).toContain("12");
      expect(html).toContain("3");
      expect(html).toContain("5");
      expect(html).toContain("92%");
      expect(html).toContain("ACELERA AUTO CRM");
      expect(html).toContain("https://aceleraautocrm.com.br/dashboard");
    });
  });

  describe("sendDailyDigestEmail", () => {
    it("deve operar em modo simulação quando RESEND_API_KEY não estiver definida", async () => {
      delete process.env.RESEND_API_KEY;

      const result = await sendDailyDigestEmail({
        to: "gestor@autoprime.com.br",
        recipientName: "Gestor Carlos",
        storeName: "Auto Prime",
        metrics: {
          newLeadsCount: 4,
          stalledLeadsCount: 1,
          wonDealsCount: 2,
          slaComplianceRate: 85,
        },
      });

      expect(result.success).toBe(true);
      expect(result.simulated).toBe(true);
      expect(result.messageId).toMatch(/^sim_digest_/);
    });

    it("deve enviar requisição HTTP ao Resend quando RESEND_API_KEY estiver configurada", async () => {
      process.env.RESEND_API_KEY = "re_test_key_123456";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: "msg_resend_98765" }),
      });
      global.fetch = mockFetch;

      const result = await sendDailyDigestEmail({
        to: "roberto@autoprime.com.br",
        recipientName: "Roberto",
        storeName: "Auto Prime",
        metrics: {
          newLeadsCount: 7,
          stalledLeadsCount: 0,
          wonDealsCount: 4,
          slaComplianceRate: 100,
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.resend.com/emails",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer re_test_key_123456",
            "Content-Type": "application/json",
          }),
        })
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg_resend_98765");
    });

    it("deve tratar erro retornado pela API do Resend de forma graciosa", async () => {
      process.env.RESEND_API_KEY = "re_invalid_key";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Unauthorized API key",
      });
      global.fetch = mockFetch;

      const result = await sendDailyDigestEmail({
        to: "roberto@autoprime.com.br",
        recipientName: "Roberto",
        storeName: "Auto Prime",
        metrics: {
          newLeadsCount: 0,
          stalledLeadsCount: 0,
          wonDealsCount: 0,
          slaComplianceRate: 100,
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("HTTP 401");
    });
  });

  describe("Rota do Cron (GET /api/cron/daily-digest)", () => {
    it("deve retornar 401 se nem CRON_SECRET nem sessão válida forem informados", async () => {
      process.env.CRON_SECRET = "super_secret_cron_123";

      vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
        isDemo: false,
        userId: null,
        organizationId: null,
        profile: null,
        organization: null,
        needsOnboarding: false,
      });

      const req = new NextRequest("http://localhost:3000/api/cron/daily-digest", {
        method: "GET",
      });

      const res = await cronHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("deve executar com sucesso quando Authorization Bearer CRON_SECRET for fornecido", async () => {
      process.env.CRON_SECRET = "secret_cron_token_xyz";
      delete process.env.RESEND_API_KEY;

      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockAdmin = {
        from: vi.fn((table: string) => {
          if (table === "organizations") {
            return {
              select: vi.fn().mockResolvedValue({
                data: [{ id: "org-1", name: "Concessionária Alfa" }],
                error: null,
              }),
            };
          }
          if (table === "profiles") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  in: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: "user-1",
                        full_name: "Marcos Gerente",
                        email: "marcos@alfa.com.br",
                        role: "gerente",
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "leads") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            };
          }
          return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
        }),
      };

      vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
        mockAdmin as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
      );

      const req = new NextRequest("http://localhost:3000/api/cron/daily-digest", {
        method: "GET",
        headers: {
          Authorization: "Bearer secret_cron_token_xyz",
        },
      });

      const res = await cronHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.processedCount).toBe(1);
      expect(json.results[0].recipient).toBe("marcos@alfa.com.br");
      expect(json.results[0].status).toBe("simulated");
    });

    it("deve permitir disparo de teste sob demanda via sessão autenticada", async () => {
      delete process.env.RESEND_API_KEY;

      vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
        isDemo: true,
        userId: "demo-user",
        userEmail: "gestor@autoprime.com.br",
        organizationId: "demo-org-123",
        profile: {
          id: "demo-user",
          organization_id: "demo-org-123",
          full_name: "Roberto Silva",
          email: "gestor@autoprime.com.br",
          role: "admin",
          phone: null,
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        organization: {
          id: "demo-org-123",
          name: "Auto Prime Motors",
          slug: "auto-prime",
          document: "12345678000190",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        needsOnboarding: false,
      });

      const req = new NextRequest("http://localhost:3000/api/cron/daily-digest", {
        method: "GET",
      });

      const res = await cronHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.mode).toBe("session_test");
      expect(json.recipient).toBe("gestor@autoprime.com.br");
    });
  });

  describe("sendTestDailyDigestAction (Server Action)", () => {
    it("deve disparar relatório de teste para o e-mail do usuário autenticado", async () => {
      delete process.env.RESEND_API_KEY;

      vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
        isDemo: true,
        userId: "demo-user",
        userEmail: "gestor@autoprime.com.br",
        organizationId: "demo-org",
        profile: {
          id: "demo-user",
          organization_id: "demo-org",
          full_name: "Roberto Silva",
          email: "gestor@autoprime.com.br",
          role: "admin",
          phone: null,
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        organization: {
          id: "demo-org",
          name: "Auto Prime Demo",
          slug: "auto-prime-demo",
          document: "12345678000190",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        needsOnboarding: false,
      });

      const result = await sendTestDailyDigestAction();
      expect(result.success).toBe(true);
      expect(result.recipientEmail).toBe("gestor@autoprime.com.br");
      expect(result.simulated).toBe(true);
    });
  });
});
