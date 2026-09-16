/**
 * @file asaas.test.ts
 * @description Suíte de Testes Unitários de Produção para a Integração do Asaas API v3.
 *
 * Cobertura obrigatória:
 * 1. Sanitização de CPF/CNPJ e busca/criação preventiva de clientes (customers.ts).
 * 2. Rejeição 401 no webhook para tokens inválidos ou ausentes contra process.env.ASAAS_WEBHOOK_TOKEN.
 * 3. Processamento de PAYMENT_RECEIVED e PAYMENT_CONFIRMED com atualização de organização e billing_invoices.
 * 4. Captura de evento de NFS-e autorizada (INVOICE_SYNCHRONIZED) com gravação de PDF, XML, número e código.
 * 5. Tratamento de NFS-e rejeitada (INVOICE_FAILED) sem interrupção do webhook.
 * 6. Agendamento de NFS-e (invoices.ts) com retenção tributária e vinculação de paymentId.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  sanitizeCpfCnpj,
  sanitizePostalCode,
  findCustomerByCpfCnpj,
  createCustomer,
  findOrCreateAsaasCustomer,
} from "@/lib/services/asaas/customers";
import { scheduleInvoice } from "@/lib/services/asaas/invoices";
import { POST } from "@/app/api/webhooks/asaas/route";
import { resetProcessedEventsCache } from "@/lib/services/asaas/webhook-service";
import * as supabaseServerModule from "@/lib/supabase/server";
import * as supabaseAdminModule from "@/lib/supabase/admin";

describe("[UNIT-ASAAS] Integração de Produção com a API v3 do Asaas", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    resetProcessedEventsCache();
    process.env = { ...originalEnv };
    process.env.ASAAS_API_KEY = "test_asaas_api_key";
    process.env.ASAAS_API_URL = "https://api.asaas.com/v3";
    process.env.ASAAS_WEBHOOK_TOKEN = "webhook_token_secreto_super_seguro_123";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("1. Sanitização de CPF/CNPJ e Gestão Preventiva de Clientes", () => {
    it("deve higienizar CPF e CNPJ removendo todos os caracteres não numéricos", () => {
      expect(sanitizeCpfCnpj("123.456.789-00")).toBe("12345678900");
      expect(sanitizeCpfCnpj("12.345.678/0001-90")).toBe("12345678000190");
      expect(sanitizeCpfCnpj("  999.888.777-66  ")).toBe("99988877766");
      expect(sanitizeCpfCnpj(null)).toBe("");
      expect(sanitizeCpfCnpj(undefined)).toBe("");
    });

    it("deve higienizar CEP removendo pontuações", () => {
      expect(sanitizePostalCode("88000-000")).toBe("88000000");
      expect(sanitizePostalCode(" 12345-678 ")).toBe("12345678");
      expect(sanitizePostalCode(null)).toBe("");
    });

    it("deve consultar cliente existente por CPF/CNPJ antes de criar novo", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          object: "list",
          hasMore: false,
          totalCount: 1,
          limit: 10,
          offset: 0,
          data: [
            {
              id: "cus_existente_001",
              name: "Auto Shopping Silva",
              cpfCnpj: "12345678000190",
              email: "contato@silva.com.br",
            },
          ],
        }),
      });
      global.fetch = mockFetch;

      const customer = await findCustomerByCpfCnpj("12.345.678/0001-90");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/customers?cpfCnpj=12345678000190");
      expect(customer).not.toBeNull();
      expect(customer?.id).toBe("cus_existente_001");
      expect(customer?.name).toBe("Auto Shopping Silva");
    });

    it("deve retornar null na busca de cliente quando não encontrado", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          object: "list",
          hasMore: false,
          totalCount: 0,
          limit: 10,
          offset: 0,
          data: [],
        }),
      });

      const customer = await findCustomerByCpfCnpj("00.000.000/0001-00");
      expect(customer).toBeNull();
    });

    it("deve criar cliente com campos cadastrais e fiscais completos", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          id: "cus_novo_fiscal_001",
          name: "Concessionária Avenida",
          cpfCnpj: "98765432000188",
          email: "fiscal@avenida.com.br",
          phone: "4832321122",
          postalCode: "88015100",
          address: "Av. Beira Mar Norte",
          addressNumber: "1500",
          complement: "Sala 201",
          province: "Centro",
          externalReference: "org-avenida-001",
        }),
      });
      global.fetch = mockFetch;

      const created = await createCustomer({
        name: "Concessionária Avenida",
        cpfCnpj: "98.765.432/0001-88",
        email: "fiscal@avenida.com.br",
        phone: "(48) 3232-1122",
        postalCode: "88015-100",
        address: "Av. Beira Mar Norte",
        addressNumber: "1500",
        complement: "Sala 201",
        province: "Centro",
        organizationId: "org-avenida-001",
      });

      expect(created.id).toBe("cus_novo_fiscal_001");
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(requestBody.cpfCnpj).toBe("98765432000188");
      expect(requestBody.postalCode).toBe("88015100");
      expect(requestBody.address).toBe("Av. Beira Mar Norte");
      expect(requestBody.addressNumber).toBe("1500");
      expect(requestBody.complement).toBe("Sala 201");
      expect(requestBody.province).toBe("Centro");
      expect(requestBody.externalReference).toBe("org-avenida-001");
    });

    it("findOrCreateAsaasCustomer não deve duplicar cliente existente por CPF/CNPJ", async () => {
      // 1. Mock de busca preventiva retornando cliente existente
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          object: "list",
          data: [
            {
              id: "cus_ja_cadastrado_999",
              name: "Cliente Antigo",
              cpfCnpj: "11122233344",
            },
          ],
        }),
      });

      const customer = await findOrCreateAsaasCustomer({
        name: "Cliente Antigo",
        cpfCnpj: "111.222.333-44",
        email: "antigo@teste.com",
      });

      expect(customer.id).toBe("cus_ja_cadastrado_999");
      // Deve ter feito apenas a busca (GET), sem chamar a criação (POST)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("2. Validação Estrita de Segurança do Webhook (401 Unauthorized)", () => {
    it("deve retornar 401 Unauthorized se o header asaas-access-token estiver ausente", async () => {
      const request = new NextRequest("http://localhost:3000/api/webhooks/asaas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "PAYMENT_RECEIVED",
          payment: { id: "pay_123", value: 297 },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.error).toContain("Unauthorized");
      expect(json.received).toBe(false);
    });

    it("deve retornar 401 Unauthorized se o header asaas-access-token for inválido", async () => {
      const request = new NextRequest("http://localhost:3000/api/webhooks/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": "token_incorreto_hacker",
        },
        body: JSON.stringify({
          event: "PAYMENT_RECEIVED",
          payment: { id: "pay_123", value: 297 },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.error).toContain("Unauthorized");
    });

    it("deve aceitar a requisição com 200 OK quando o token for idêntico a ASAAS_WEBHOOK_TOKEN", async () => {
      const request = new NextRequest("http://localhost:3000/api/webhooks/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": "webhook_token_secreto_super_seguro_123",
        },
        body: JSON.stringify({
          id: "evt_auth_ok_001",
          event: "PAYMENT_RECEIVED",
          payment: { id: "pay_demo_test", value: 297 },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.received).toBe(true);
    });
  });

  describe("3. Processamento de PAYMENT_RECEIVED com Atualização Relacional", () => {
    it("deve processar PAYMENT_RECEIVED, ativar a organização para 'active' e gravar em billing_invoices", async () => {
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockOrgUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockInvoiceInsert = vi.fn().mockResolvedValue({ error: null });
      const mockInvoiceUpsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "inv_row_001" }, error: null }),
        }),
      });

      const mockAdminSupabase = {
        from: vi.fn((table: string) => {
          if (table === "organizations") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: "org-acelera-999",
                      name: "Acelera Motors",
                      plan: "pro",
                      billing_status: "trialing",
                      subscription_status: "trialing",
                      max_sellers: 8,
                    },
                  }),
                }),
                or: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                }),
              }),
              update: mockOrgUpdate,
            };
          }

          if (table === "billing_invoices") {
            return {
              upsert: mockInvoiceUpsert,
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                }),
              }),
              insert: mockInvoiceInsert,
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }

          return {};
        }),
      };

      vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
        mockAdminSupabase as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
      );

      const request = new NextRequest("http://localhost:3000/api/webhooks/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": "webhook_token_secreto_super_seguro_123",
        },
        body: JSON.stringify({
          id: "evt_pay_rec_001",
          event: "PAYMENT_RECEIVED",
          payment: {
            id: "pay_rec_123456",
            customer: "cus_rec_001",
            value: 497.0,
            netValue: 494.01,
            billingType: "PIX",
            status: "RECEIVED",
            paymentDate: "2026-09-16",
            invoiceUrl: "https://asaas.com/i/123456",
            invoiceNumber: "NF-00123",
            externalReference: "org-acelera-999",
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.received).toBe(true);
      expect(json.organizationId).toBe("org-acelera-999");
      expect(json.actionTaken).toBe("payment_confirmed_subscription_activated");

      // Verifica atualização da organização com billing_status = 'active'
      expect(mockOrgUpdate).toHaveBeenCalled();
      const orgUpdatePayload = mockOrgUpdate.mock.calls[0][0];
      expect(orgUpdatePayload.subscription_status).toBe("active");
      expect(orgUpdatePayload.billing_status).toBe("active");

      // Verifica upsert do pagamento na tabela billing_invoices com onConflict
      expect(mockInvoiceUpsert).toHaveBeenCalled();
      const [upsertPayload, upsertOptions] = mockInvoiceUpsert.mock.calls[0];
      expect(upsertOptions).toEqual({ onConflict: "asaas_payment_id" });
      expect(upsertPayload.organization_id).toBe("org-acelera-999");
      expect(upsertPayload.asaas_payment_id).toBe("pay_rec_123456");
      expect(upsertPayload.amount).toBe(497.0);
      expect(upsertPayload.billing_type).toBe("PIX");
      expect(upsertPayload.status).toBe("RECEIVED");
      expect(upsertPayload.invoice_number).toBe("NF-00123");
      expect(upsertPayload.paid_at).toBeDefined();
    });

    it("deve capturar invoiceError no upsert de billing_invoices, logar console.error e disparar exceção", async () => {
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const dbError = new Error("Database rejected invoice insert: duplicate or check constraint");
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const mockAdminSupabase = {
        from: vi.fn((table: string) => {
          if (table === "organizations") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: "org-acelera-999",
                      name: "Acelera Motors",
                      plan: "pro",
                      billing_status: "trialing",
                    },
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }

          if (table === "billing_invoices") {
            return {
              upsert: vi.fn().mockResolvedValue({ data: null, error: dbError }),
            };
          }

          return {};
        }),
      };

      vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
        mockAdminSupabase as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
      );

      const request = new NextRequest("http://localhost:3000/api/webhooks/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": "webhook_token_secreto_super_seguro_123",
        },
        body: JSON.stringify({
          id: "evt_pay_error_test",
          event: "PAYMENT_RECEIVED",
          payment: {
            id: "pay_err_999",
            value: 297.0,
            billingType: "CREDIT_CARD",
            status: "CONFIRMED",
            externalReference: "org-acelera-999",
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.error).toBe("Internal error processing webhook event");

      expect(errorSpy).toHaveBeenCalledWith(
        "[WEBHOOK] Erro ao gravar billing_invoices:",
        dbError
      );
    });
  });

  describe("4. Captura de Eventos Fiscais de NFS-e (INVOICE_SYNCHRONIZED & INVOICE_FAILED)", () => {
    it("deve processar INVOICE_SYNCHRONIZED e atualizar linha com asaas_invoice_id, number, verification_code e pdf_url", async () => {
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockInvoiceUpdateEq = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: "inv_existente_001", organization_id: "org-nfse-001" }],
          error: null,
        }),
      });
      const mockInvoiceUpdate = vi.fn().mockReturnValue({
        eq: mockInvoiceUpdateEq,
      });

      const mockAdminSupabase = {
        from: vi.fn((table: string) => {
          if (table === "organizations") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: "org-nfse-001", name: "Auto Car" },
                  }),
                }),
              }),
            };
          }
          if (table === "billing_invoices") {
            return {
              update: mockInvoiceUpdate,
              upsert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
        mockAdminSupabase as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
      );

      const request = new NextRequest("http://localhost:3000/api/webhooks/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": "webhook_token_secreto_super_seguro_123",
        },
        body: JSON.stringify({
          id: "evt_invoice_sync_001",
          event: "INVOICE_SYNCHRONIZED",
          invoice: {
            id: "inv_asaas_888",
            status: "SYNCHRONIZED",
            payment: "pay_rec_123456",
            number: "2026000099",
            verificationCode: "ABC-7766-XYZ",
            pdfUrl: "https://asaas.com/invoices/2026000099.pdf",
            xmlUrl: "https://asaas.com/invoices/2026000099.xml",
            value: 497.0,
            effectiveDate: "2026-09-16",
            serviceDescription: "Licença de Software SaaS Acelera Auto CRM",
            externalReference: "org-nfse-001",
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.received).toBe(true);
      expect(json.actionTaken).toBe("invoice_synchronized");

      expect(mockInvoiceUpdate).toHaveBeenCalled();
      const updatedData = mockInvoiceUpdate.mock.calls[0][0];
      expect(updatedData.asaas_invoice_id).toBe("inv_asaas_888");
      expect(updatedData.number).toBe("2026000099");
      expect(updatedData.verification_code).toBe("ABC-7766-XYZ");
      expect(updatedData.pdf_url).toBe("https://asaas.com/invoices/2026000099.pdf");
      expect(updatedData.xml_url).toBe("https://asaas.com/invoices/2026000099.xml");
      expect(updatedData.status).toBe("SYNCHRONIZED");
      expect(mockInvoiceUpdateEq).toHaveBeenCalledWith("asaas_payment_id", "pay_rec_123456");
    });

    it("não deve ignorar evento INVOICE_SYNCHRONIZED mesmo se reenviado com mesmo ID de evento (não descarta por idempotência)", async () => {
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockInvoiceUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockAdminSupabase = {
        from: vi.fn((table: string) => {
          if (table === "organizations") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: "org-nfse-001", name: "Auto Car" },
                  }),
                }),
              }),
            };
          }
          if (table === "billing_invoices") {
            return {
              update: mockInvoiceUpdate,
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
        mockAdminSupabase as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
      );

      const payload = {
        id: "evt_duplicate_invoice_sync",
        event: "INVOICE_SYNCHRONIZED",
        invoice: {
          id: "inv_retry_001",
          status: "SYNCHRONIZED",
          payment: "pay_retry_123",
          number: "2026000100",
          pdfUrl: "https://asaas.com/invoices/2026000100.pdf",
          verificationCode: "RETRY-123",
          externalReference: "org-nfse-001",
        },
      };

      // 1º envio
      const req1 = new NextRequest("http://localhost:3000/api/webhooks/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": "webhook_token_secreto_super_seguro_123",
        },
        body: JSON.stringify(payload),
      });
      const res1 = await POST(req1);
      const json1 = await res1.json();
      expect(json1.actionTaken).toBe("invoice_synchronized");
      expect(json1.alreadyProcessed).toBe(false);

      // 2º envio (reenvio com mesmo payload e mesmo id de evento)
      const req2 = new NextRequest("http://localhost:3000/api/webhooks/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": "webhook_token_secreto_super_seguro_123",
        },
        body: JSON.stringify(payload),
      });
      const res2 = await POST(req2);
      const json2 = await res2.json();
      expect(json2.actionTaken).toBe("invoice_synchronized");
      expect(json2.alreadyProcessed).toBe(false);
      expect(mockInvoiceUpdate).toHaveBeenCalledTimes(2);
    });

    it("deve processar INVOICE_FAILED e registrar o motivo de falha sem derrubar o webhook", async () => {
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockInvoiceUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockAdminSupabase = {
        from: vi.fn((table: string) => {
          if (table === "organizations") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: "org-nfse-001", name: "Auto Car" },
                  }),
                }),
              }),
            };
          }
          if (table === "billing_invoices") {
            return {
              update: mockInvoiceUpdate,
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
        mockAdminSupabase as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
      );

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const request = new NextRequest("http://localhost:3000/api/webhooks/asaas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": "webhook_token_secreto_super_seguro_123",
        },
        body: JSON.stringify({
          id: "evt_invoice_fail_001",
          event: "INVOICE_FAILED",
          invoice: {
            id: "inv_asaas_failed_111",
            status: "ERROR",
            payment: "pay_111",
            failedReason: "Inscrição municipal do prestador irregular na prefeitura",
            externalReference: "org-nfse-001",
          },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.received).toBe(true);
      expect(json.actionTaken).toBe("invoice_failed_logged");

      expect(mockInvoiceUpdate).toHaveBeenCalled();
      const updatedData = mockInvoiceUpdate.mock.calls[0][0];
      expect(updatedData.status).toBe("FAILED");
      expect(updatedData.failure_reason).toBe(
        "Inscrição municipal do prestador irregular na prefeitura"
      );

      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe("5. Agendamento de Emissão de NFS-e (invoices.ts)", () => {
    it("deve enviar parâmetros tributários e vinculação de paymentId ao agendar NFS-e", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          id: "inv_agendada_123",
          status: "SCHEDULED",
          payment: "pay_xyz_123",
          value: 297.0,
          effectiveDate: "2026-09-20",
          serviceDescription: "Licença de Software SaaS Acelera Auto CRM",
        }),
      });
      global.fetch = mockFetch;

      const scheduled = await scheduleInvoice({
        payment: "pay_xyz_123",
        value: 297.0,
        serviceDescription: "Licença de Software SaaS Acelera Auto CRM",
        effectiveDate: "2026-09-20",
        taxes: {
          retainIss: false,
          iss: 2.0,
          pis: 0.65,
          cofins: 3.0,
        },
      });

      expect(scheduled.id).toBe("inv_agendada_123");
      expect(scheduled.status).toBe("SCHEDULED");

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(requestBody.payment).toBe("pay_xyz_123");
      expect(requestBody.value).toBe(297.0);
      expect(requestBody.effectiveDate).toBe("2026-09-20");
      expect(requestBody.taxes.iss).toBe(2.0);
      expect(requestBody.taxes.pis).toBe(0.65);
      expect(requestBody.taxes.cofins).toBe(3.0);
    });
  });
});
