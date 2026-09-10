/**
 * @file asaas-webhook-security.test.ts
 * @description Suíte de Testes Unitários para Blindagem e Segurança de Webhooks Asaas (Conta Compartilhada).
 *
 * Cenários Obrigatórios:
 * 1. Retorno 401 em caso de token incorreto ou ausente.
 * 2. Retorno 200 (ignored: true, reason: 'unrelated_organization') para evento com customer/subscription inexistente no CRM (cenário Catuto Flow).
 * 3. Retorno 200 (ignored: true, reason: 'unhandled_event') para eventos não monitorados pelo CRM (ex: TRANSFER_CREATED, antecipações).
 * 4. Processamento correto e ativação quando o customer/subscription pertence a uma organização do CRM.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/webhooks/asaas/route";
import { resetProcessedEventsCache } from "@/lib/services/asaas/webhook-service";
import * as supabaseServerModule from "@/lib/supabase/server";
import * as supabaseAdminModule from "@/lib/supabase/admin";

describe("[UNIT-ASAAS-WEBHOOK-SECURITY] Blindagem e Descarte Silencioso Seguro", () => {
  const VALID_TOKEN = "asaas_webhook_secret_live";

  beforeEach(() => {
    vi.restoreAllMocks();
    resetProcessedEventsCache();
  });

  describe("1. Segurança e Validação de Token (401 Unauthorized)", () => {
    it("deve retornar 401 Unauthorized quando o header asaas-access-token estiver ausente", async () => {
      const request = new NextRequest("http://localhost:3000/api/webhooks/asaas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "PAYMENT_CONFIRMED",
          payment: { id: "pay_123", customer: "cus_catuto_flow" },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.received).toBe(false);
      expect(json.error).toContain("Unauthorized");
    });

    it("deve retornar 401 Unauthorized quando o token for inválido", async () => {
      const request = new NextRequest("http://localhost:3000/api/webhooks/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": "token_invalido_estranho",
        },
        body: JSON.stringify({
          event: "PAYMENT_CONFIRMED",
          payment: { id: "pay_123", customer: "cus_catuto_flow" },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.received).toBe(false);
      expect(json.error).toContain("Unauthorized");
    });
  });

  describe("2. Guarda de Pertencimento & Descarte Silencioso (Cenário Catuto Flow)", () => {
    it("deve retornar 200 OK com ignored: true e reason: 'unrelated_organization' quando customer for do Catuto Flow", async () => {
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockUpdate = vi.fn();
      const mockAdminSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
            or: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
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
          id: "evt_catuto_001",
          event: "PAYMENT_CONFIRMED",
          dateCreated: "2026-09-10T12:00:00Z",
          payment: {
            id: "pay_catuto_flow_999",
            customer: "cus_catuto_flow_001",
            subscription: "sub_catuto_flow_001",
            value: 450.0,
            billingType: "PIX",
            status: "CONFIRMED",
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.received).toBe(true);
      expect(json.ignored).toBe(true);
      expect(json.reason).toBe("unrelated_organization");

      // Garante que o banco de dados do CRM NUNCA foi tocado
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("deve descartar silenciosamente faturas avulsas com externalReference de outra aplicação", async () => {
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockUpdate = vi.fn();
      const mockAdminSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
            or: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
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
          id: "evt_catuto_invoice_002",
          event: "PAYMENT_RECEIVED",
          payment: {
            id: "pay_catuto_inv_888",
            customer: "cus_catuto_eng_444",
            externalReference: "catuto-project-uuid-999",
            value: 1200.0,
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.received).toBe(true);
      expect(json.ignored).toBe(true);
      expect(json.reason).toBe("unrelated_organization");
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("3. Tratamento de Eventos Desconhecidos ou Secundários (HTTP 200)", () => {
    it("deve retornar 200 OK com ignored: true e reason: 'unhandled_event' para TRANSFER_CREATED", async () => {
      const mockUpdate = vi.fn();
      const mockAdminSupabase = {
        from: vi.fn().mockReturnValue({ update: mockUpdate }),
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
          id: "evt_transfer_001",
          event: "TRANSFER_CREATED",
          transfer: {
            id: "trans_123456",
            value: 2000.0,
            status: "PENDING",
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.received).toBe(true);
      expect(json.ignored).toBe(true);
      expect(json.reason).toBe("unhandled_event");

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("deve tratar graciosamente qualquer evento secundário sem lançar erro não capturado", async () => {
      const request = new NextRequest("http://localhost:3000/api/webhooks/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": VALID_TOKEN,
        },
        body: JSON.stringify({
          id: "evt_anticipation_002",
          event: "ANTICIPATION_SCHEDULED",
          anticipation: { id: "ant_999", value: 5000 },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.received).toBe(true);
      expect(json.ignored).toBe(true);
      expect(json.reason).toBe("unhandled_event");
    });
  });

  describe("4. Processamento Correto de Organização Pertencente ao CRM", () => {
    it("deve processar PAYMENT_CONFIRMED e atualizar a organização para active quando pertencer ao CRM", async () => {
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockAdminSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((col: string, val: string) => {
              if (col === "asaas_customer_id" && val === "cus_crm_acelera_001") {
                return {
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: "org-acelera-001",
                      name: "Acelera Veículos Matriz",
                      plan: "pro",
                      subscription_status: "trialing",
                    },
                  }),
                };
              }
              return {
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              };
            }),
            or: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
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
          id: "evt_crm_pay_001",
          event: "PAYMENT_CONFIRMED",
          payment: {
            id: "pay_acelera_123",
            customer: "cus_crm_acelera_001",
            subscription: "sub_acelera_123",
            value: 597.0,
            billingType: "CREDIT_CARD",
            status: "CONFIRMED",
            dueDate: "2026-09-10",
            description: "Assinatura Acelera Auto Pro",
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.received).toBe(true);
      expect(json.ignored).toBeUndefined();
      expect(json.actionTaken).toBe("payment_confirmed_subscription_activated");

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_status: "active",
          plan: "pro",
          max_sellers: 8,
          trial_ends_at: null,
          asaas_customer_id: "cus_crm_acelera_001",
          asaas_subscription_id: "sub_acelera_123",
        })
      );
    });
  });

  describe("5. Resiliência de Payload (400 Bad Request)", () => {
    it("deve retornar 400 Bad Request se o corpo não for um JSON válido", async () => {
      const request = new NextRequest("http://localhost:3000/api/webhooks/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": VALID_TOKEN,
        },
        body: "corpo_invalido_nao_json",
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.received).toBe(false);
      expect(json.error).toContain("Invalid JSON");
    });

    it("deve retornar 400 Bad Request se o campo 'event' estiver ausente", async () => {
      const request = new NextRequest("http://localhost:3000/api/webhooks/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": VALID_TOKEN,
        },
        body: JSON.stringify({
          payment: { id: "pay_sem_evento" },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.received).toBe(false);
      expect(json.error).toContain("Missing 'event'");
    });
  });
});
