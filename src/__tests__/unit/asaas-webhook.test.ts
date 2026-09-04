/**
 * @file asaas-webhook.test.ts
 * @description Suíte de Testes Automatizados para a Rota de Webhooks do Asaas (/api/webhooks/asaas).
 *
 * Cenários Testados:
 * - [TEST-ASAAS-AUTH]: Rejeição de requisições sem token de acesso ou com token inválido (401 Unauthorized).
 * - [TEST-ASAAS-PAYMENT-CONFIRMED]: Processamento de PAYMENT_CONFIRMED e ativação da assinatura no Supabase.
 * - [TEST-ASAAS-PAYMENT-OVERDUE]: Processamento de PAYMENT_OVERDUE e marcação de inadimplência (past_due).
 * - [TEST-ASAAS-SUBSCRIPTION-LIFECYCLE]: Sincronização de SUBSCRIPTION_UPDATED e cancelamento via SUBSCRIPTION_DELETED.
 * - [TEST-ASAAS-IDEMPOTENCY]: Idempotência e deduplicação de eventos repetidos do Asaas.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/webhooks/asaas/route";
import { resetProcessedEventsCache } from "@/lib/services/asaas/webhook-service";
import * as supabaseServerModule from "@/lib/supabase/server";
import * as supabaseAdminModule from "@/lib/supabase/admin";

describe("[UNIT-ASAAS-WEBHOOK] Processamento Seguro e Idempotente de Webhooks Asaas", () => {
  const VALID_TOKEN = "asaas_webhook_secret_live";

  beforeEach(() => {
    vi.restoreAllMocks();
    resetProcessedEventsCache();
  });

  describe("[TEST-ASAAS-AUTH] Validação de Segurança de Token", () => {
    it("deve retornar 401 Unauthorized se o header asaas-access-token estiver ausente", async () => {
      const request = new NextRequest("http://localhost:3000/api/webhooks/asaas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "PAYMENT_CONFIRMED",
          payment: { id: "pay_123" },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.error).toContain("Unauthorized");
    });

    it("deve retornar 401 Unauthorized se o token fornecido for inválido", async () => {
      const request = new NextRequest("http://localhost:3000/api/webhooks/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": "token_invalido_hacker",
        },
        body: JSON.stringify({
          event: "PAYMENT_CONFIRMED",
          payment: { id: "pay_123" },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("deve aceitar header asaas-access-token configurado no env ou fallback dev", async () => {
      const request = new NextRequest("http://localhost:3000/api/webhooks/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": "token_secreto_para_validar_webhook_acelera",
        },
        body: JSON.stringify({
          event: "PAYMENT_CONFIRMED",
          payment: { id: "pay_demo_test" },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.received).toBe(true);
    });

    it("deve aceitar header em formato Pascal-Case 'Asaas-Access-Token' e token com espaços (trim)", async () => {
      const originalSecret = process.env.ASAAS_WEBHOOK_SECRET;
      process.env.ASAAS_WEBHOOK_SECRET = "  meu_secret_customizado_123  ";

      try {
        const request = new NextRequest("http://localhost:3000/api/webhooks/asaas", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Asaas-Access-Token": "  meu_secret_customizado_123  ",
          },
          body: JSON.stringify({
            event: "PAYMENT_CONFIRMED",
            payment: { id: "pay_demo_test" },
          }),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      } finally {
        process.env.ASAAS_WEBHOOK_SECRET = originalSecret;
      }
    });
  });

  describe("[TEST-ASAAS-PAYMENT-CONFIRMED] Confirmação de Pagamento & Ativação", () => {
    it("deve processar PAYMENT_CONFIRMED e atualizar organização para active no Supabase", async () => {
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockAdminSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: "org-loja-prime-001", name: "Loja Prime" },
              }),
            }),
          }),
          update: mockUpdate,
        }),
      };

      vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
        mockAdminSupabase as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
      );

      const request = new NextRequest("http://localhost:3000/api/webhooks/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": VALID_TOKEN,
        },
        body: JSON.stringify({
          id: "evt_pay_conf_001",
          event: "PAYMENT_CONFIRMED",
          dateCreated: "2026-08-27 16:50:00",
          payment: {
            id: "pay_987654",
            customer: "cus_000001",
            subscription: "sub_000001",
            value: 597.0,
            billingType: "PIX",
            status: "CONFIRMED",
            dueDate: "2026-09-27",
            description: "Assinatura Plano Pro (Mensal)",
            externalReference: JSON.stringify({
              orgId: "org-loja-prime-001",
              plan: "pro",
              cycle: "MONTHLY",
            }),
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.received).toBe(true);
      expect(json.event).toBe("PAYMENT_CONFIRMED");
      expect(json.actionTaken).toBe("payment_confirmed_subscription_activated");

      expect(mockAdminSupabase.from).toHaveBeenCalledWith("organizations");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_status: "active",
          plan: "pro",
          max_sellers: 8,
          trial_ends_at: null,
          asaas_customer_id: "cus_000001",
          asaas_subscription_id: "sub_000001",
        })
      );
    });

    it("deve processar PAYMENT_CONFIRMED de upgrade para Enterprise e persistir max_sellers: 999", async () => {
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockAdminSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: "org-loja-prime-001", name: "Loja Prime" },
              }),
            }),
          }),
          update: mockUpdate,
        }),
      };

      vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
        mockAdminSupabase as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
      );

      const request = new NextRequest("http://localhost:3000/api/webhooks/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": VALID_TOKEN,
        },
        body: JSON.stringify({
          id: "evt_pay_conf_enterprise",
          event: "PAYMENT_CONFIRMED",
          payment: {
            id: "pay_ent_123",
            customer: "cus_000001",
            subscription: "sub_ent_123",
            value: 12970.0,
            billingType: "PIX",
            status: "CONFIRMED",
            description: "Assinatura Plano Enterprise (Anual)",
            externalReference: JSON.stringify({
              orgId: "org-loja-prime-001",
              plan: "enterprise",
              cycle: "YEARLY",
            }),
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_status: "active",
          plan: "enterprise",
          max_sellers: 999,
        })
      );
    });
  });

  describe("[TEST-ASAAS-PAYMENT-OVERDUE] Pagamento Vencido / Inadimplência", () => {
    it("deve processar PAYMENT_OVERDUE e atualizar organização para past_due no Supabase", async () => {
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockAdminSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: "org-loja-prime-001", name: "Loja Prime" },
              }),
            }),
          }),
          update: mockUpdate,
        }),
      };

      vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
        mockAdminSupabase as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
      );

      const request = new NextRequest("http://localhost:3000/api/webhooks/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": VALID_TOKEN,
        },
        body: JSON.stringify({
          id: "evt_pay_overdue_001",
          event: "PAYMENT_OVERDUE",
          payment: {
            id: "pay_overdue_999",
            customer: "cus_000001",
            externalReference: "org-loja-prime-001",
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.received).toBe(true);
      expect(json.event).toBe("PAYMENT_OVERDUE");
      expect(json.actionTaken).toBe("payment_overdue_marked_past_due");

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_status: "past_due",
        })
      );
    });
  });

  describe("[TEST-ASAAS-SUBSCRIPTION-LIFECYCLE] Ciclo de Vida da Assinatura", () => {
    it("deve processar SUBSCRIPTION_DELETED e marcar organização como canceled", async () => {
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockAdminSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: "org-cancel-001", name: "Loja Cancel" },
              }),
            }),
          }),
          update: mockUpdate,
        }),
      };

      vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
        mockAdminSupabase as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
      );

      const request = new NextRequest("http://localhost:3000/api/webhooks/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": VALID_TOKEN,
        },
        body: JSON.stringify({
          id: "evt_sub_del_001",
          event: "SUBSCRIPTION_DELETED",
          subscription: {
            id: "sub_deleted_123",
            customer: "cus_deleted_123",
            externalReference: "org-cancel-001",
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.received).toBe(true);
      expect(json.actionTaken).toBe("subscription_canceled");

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_status: "canceled",
        })
      );
    });
  });

  describe("[TEST-ASAAS-IDEMPOTENCY] Deduplicação Idempotente", () => {
    it("deve identificar eventos duplicados e ignorar re-execução sem erro", async () => {
      const payload = {
        id: "evt_idempotent_123",
        event: "PAYMENT_CONFIRMED" as const,
        payment: {
          id: "pay_idemp_123",
          externalReference: "org-001",
        },
      };

      // Primeira execução
      const req1 = new NextRequest("http://localhost:3000/api/webhooks/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": VALID_TOKEN,
        },
        body: JSON.stringify(payload),
      });

      const res1 = await POST(req1);
      const json1 = await res1.json();
      expect(json1.received).toBe(true);
      expect(json1.alreadyProcessed).toBe(false);

      // Segunda execução (duplicada)
      const req2 = new NextRequest("http://localhost:3000/api/webhooks/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": VALID_TOKEN,
        },
        body: JSON.stringify(payload),
      });

      const res2 = await POST(req2);
      const json2 = await res2.json();
      expect(json2.received).toBe(true);
      expect(json2.alreadyProcessed).toBe(true);
      expect(json2.actionTaken).toBe("skipped_duplicate_event");
    });
  });

  describe("[TEST-ASAAS-NOT-FOUND] Tratamento Gracioso de Organização Não Localizada", () => {
    it("deve responder 200 OK com skipped_organization_not_found quando o tenant/customer não existir", async () => {
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockAdminSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }),
      };

      vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
        mockAdminSupabase as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
      );

      const request = new NextRequest("http://localhost:3000/api/v1/webhooks/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": VALID_TOKEN,
        },
        body: JSON.stringify({
          id: "evt_unknown_org_001",
          event: "PAYMENT_CONFIRMED",
          payment: {
            id: "pay_unknown_123",
            customer: "cus_inexistente_999",
            externalReference: "org-inexistente-uuid",
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.received).toBe(true);
      expect(json.actionTaken).toBe("skipped_organization_not_found");
    });
  });

  describe("[TEST-ASAAS-DEMO-PROTECTION] Proteção do Modo Demonstração", () => {
    it("não deve alterar o banco de dados de produção se o payload for do tenant demo", async () => {
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);
      const mockAdminSupabase = {
        from: vi.fn(),
      };
      vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
        mockAdminSupabase as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
      );

      const request = new NextRequest("http://localhost:3000/api/v1/webhooks/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": VALID_TOKEN,
        },
        body: JSON.stringify({
          id: "evt_demo_sim_001",
          event: "PAYMENT_CONFIRMED",
          payment: {
            id: "pay_demo_test",
            externalReference: "00000000-0000-0000-0000-000000000001",
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.received).toBe(true);
      expect(json.actionTaken).toBe("demo_simulation_acknowledged");
      expect(mockAdminSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe("[TEST-ASAAS-REFUND] Estorno de Pagamento", () => {
    it("deve processar PAYMENT_REFUNDED e suspender a assinatura no Supabase", async () => {
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockAdminSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: "org-refund-001", name: "Loja Refund" },
              }),
            }),
          }),
          update: mockUpdate,
        }),
      };

      vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
        mockAdminSupabase as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
      );

      const request = new NextRequest("http://localhost:3000/api/v1/webhooks/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": VALID_TOKEN,
        },
        body: JSON.stringify({
          id: "evt_refund_001",
          event: "PAYMENT_REFUNDED",
          payment: {
            id: "pay_ref_123",
            customer: "cus_ref_001",
            externalReference: "org-refund-001",
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.received).toBe(true);
      expect(json.actionTaken).toBe("payment_refunded_subscription_suspended");

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_status: "inactive",
        })
      );
    });
  });
});
