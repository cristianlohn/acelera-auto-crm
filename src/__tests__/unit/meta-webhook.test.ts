/**
 * @file meta-webhook.test.ts
 * @description Suíte de testes unitários para a integração oficial do Meta Lead Ads (Facebook & Instagram).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import crypto from "crypto";
import { GET as metaGetHandler, POST as metaPostHandler } from "@/app/api/v1/webhooks/meta/route";
import {
  fetchMetaLeadgenData,
  sanitizeMetaPhone,
  normalizeMetaFieldData,
  processMetaLeadgen,
} from "@/lib/services/meta/meta-lead-service";

function createWebhookRequest(
  url: string,
  method: "GET" | "POST",
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };
  if (body !== undefined && method === "POST") {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

describe("[UNIT-META-WEBHOOK] Webhook & Ingestão de Leads Meta Ads (Facebook/Instagram)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("1. Handshake de Verificação GET (hub.challenge / hub.verify_token)", () => {
    it("deve responder com status 200 e o challenge para o token padrão 'acelera_meta_webhook_secret'", async () => {
      const challengeCode = "challenge_123456789";
      const req = createWebhookRequest(
        `/api/v1/webhooks/meta?hub.mode=subscribe&hub.verify_token=acelera_meta_webhook_secret&hub.challenge=${challengeCode}`,
        "GET"
      );

      const res = await metaGetHandler(req);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe(challengeCode);
    });

    it("deve aceitar o token configurado via variável de ambiente META_VERIFY_TOKEN", async () => {
      process.env.META_VERIFY_TOKEN = "meu_token_custom_meta_2026";
      const challengeCode = "challenge_987654";
      const req = createWebhookRequest(
        `/api/v1/webhooks/meta?hub.mode=subscribe&hub.verify_token=meu_token_custom_meta_2026&hub.challenge=${challengeCode}`,
        "GET"
      );

      const res = await metaGetHandler(req);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe(challengeCode);
    });

    it("deve retornar 403 Forbidden caso o verify_token esteja incorreto", async () => {
      const req = createWebhookRequest(
        "/api/v1/webhooks/meta?hub.mode=subscribe&hub.verify_token=token_invalido&hub.challenge=123",
        "GET"
      );

      const res = await metaGetHandler(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Token de verificação do Meta inválido");
    });

    it("deve retornar 403 Forbidden caso o hub.mode não seja 'subscribe'", async () => {
      const req = createWebhookRequest(
        "/api/v1/webhooks/meta?hub.mode=publish&hub.verify_token=acelera_meta_webhook_secret&hub.challenge=123",
        "GET"
      );

      const res = await metaGetHandler(req);
      expect(res.status).toBe(403);
    });
  });

  describe("2. Sanitização de Telefone com DDI 55", () => {
    it("deve adicionar DDI 55 para números de 10 dígitos (fixo)", () => {
      expect(sanitizeMetaPhone("1133334444")).toBe("551133334444");
      expect(sanitizeMetaPhone("(11) 3333-4444")).toBe("551133334444");
    });

    it("deve adicionar DDI 55 para números de 11 dígitos (celular)", () => {
      expect(sanitizeMetaPhone("11988887777")).toBe("5511988887777");
      expect(sanitizeMetaPhone("(11) 98888-7777")).toBe("5511988887777");
    });

    it("não deve duplicar o DDI 55 quando o número já vier com 55", () => {
      expect(sanitizeMetaPhone("5511988887777")).toBe("5511988887777");
      expect(sanitizeMetaPhone("+55 (11) 98888-7777")).toBe("5511988887777");
    });

    it("deve retornar string vazia quando o telefone for nulo ou indefinido", () => {
      expect(sanitizeMetaPhone(null)).toBe("");
      expect(sanitizeMetaPhone(undefined)).toBe("");
      expect(sanitizeMetaPhone("")).toBe("");
    });
  });

  describe("3. Normalização Semântica de Field Data da Meta", () => {
    it("deve extrair nome_completo, telefone com DDI 55, email e intenção de veículo", () => {
      const fieldData = [
        { name: "nome_completo", values: ["Mariana Albuquerque"] },
        { name: "telefone", values: ["11977776666"] },
        { name: "email", values: ["mariana.albuquerque@gmail.com"] },
        { name: "qual_veiculo_tem_interesse", values: ["Jeep Compass Longitude 2024"] },
        { name: "tem_veiculo_na_troca", values: ["Sim (HB20 2021)"] },
      ];

      const result = normalizeMetaFieldData(fieldData, {
        adName: "Campanha Feirão Jeep",
        formId: "form_feirao_99",
      });

      expect(result.clientName).toBe("Mariana Albuquerque");
      expect(result.clientPhone).toBe("5511977776666");
      expect(result.clientEmail).toBe("mariana.albuquerque@gmail.com");
      expect(result.vehicleInterest).toBe("Jeep Compass Longitude 2024");
      expect(result.notes).toContain("tem_veiculo_na_troca: Sim (HB20 2021)");
      expect(result.notes).toContain("Form ID: form_feirao_99");
    });

    it("deve combinar first_name e last_name quando full_name não estiver presente", () => {
      const fieldData = [
        { name: "first_name", values: ["Rodrigo"] },
        { name: "last_name", values: ["Santoro"] },
        { name: "phone_number", values: ["47999998888"] },
      ];

      const result = normalizeMetaFieldData(fieldData);
      expect(result.clientName).toBe("Rodrigo Santoro");
      expect(result.clientPhone).toBe("5547999998888");
    });

    it("deve utilizar fallback 'Lead Meta Ads' caso nenhum nome seja enviado", () => {
      const fieldData = [{ name: "email", values: ["semnome@gmail.com"] }];
      const result = normalizeMetaFieldData(fieldData);
      expect(result.clientName).toBe("Lead Meta Ads");
    });
  });

  describe("4. Validação de Assinatura HMAC SHA-256 no POST", () => {
    it("deve rejeitar requisição com 401 caso META_APP_SECRET esteja ativo e assinatura seja inválida", async () => {
      process.env.META_APP_SECRET = "secret_meta_app_chave_secreta";

      const payload = {
        object: "page",
        entry: [],
      };

      const req = createWebhookRequest("/api/v1/webhooks/meta", "POST", payload, {
        "x-hub-signature-256": "sha256=assinatura_falsa_1234567890abcdef",
      });

      const res = await metaPostHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("Assinatura HMAC SHA-256 inválida");
    });

    it("deve aceitar requisição caso a assinatura HMAC SHA-256 seja calculada corretamente", async () => {
      const secret = "secret_meta_app_chave_secreta";
      process.env.META_APP_SECRET = secret;

      const payload = {
        object: "page",
        entry: [
          {
            id: "page_100",
            changes: [
              {
                field: "leadgen",
                value: {
                  leadgen_id: "lead_teste_hmac_1",
                  name: "Cliente HMAC Válido",
                  phone: "11988881111",
                },
              },
            ],
          },
        ],
      };

      const rawBody = JSON.stringify(payload);
      const hmac = crypto.createHmac("sha256", secret);
      hmac.update(rawBody);
      const validSignature = `sha256=${hmac.digest("hex")}`;

      const req = createWebhookRequest("/api/v1/webhooks/meta", "POST", rawBody, {
        "x-hub-signature-256": validSignature,
      });

      const res = await metaPostHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe("5. Ingestão Completa de Leads & Consulta Graph API", () => {
    it("deve ignorar eventos que não sejam do objeto 'page'", async () => {
      const req = createWebhookRequest("/api/v1/webhooks/meta", "POST", {
        object: "instagram_direct",
        entry: [],
      });

      const res = await metaPostHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("deve processar evento de leadgen com dados diretos, selecionar vendedor e despachar notificação WhatsApp", async () => {
      const req = createWebhookRequest("/api/v1/webhooks/meta", "POST", {
        object: "page",
        entry: [
          {
            id: "page_loja_prime",
            changes: [
              {
                field: "leadgen",
                value: {
                  leadgen_id: "lead_meta_full_001",
                  page_id: "page_loja_prime",
                  form_id: "form_compass_turbo",
                  ad_id: "ad_meta_carrossel_01",
                  name: "Gustavo Ferreira",
                  phone: "11987654321",
                  email: "gustavo.ferreira@hotmail.com",
                  vehicle: "Jeep Renegade Trailhawk 2024",
                },
              },
            ],
          },
        ],
      });

      const res = await metaPostHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.assigned_to).toBeDefined();
      expect(json.lead_id).toBeDefined();
      expect(json.short_code).toBeDefined();
    });

    it("deve chamar a Graph API da Meta quando token de página estiver disponível", async () => {
      const mockGraphResponse = {
        id: "leadgen_graph_999",
        ad_name: "Campanha Corolla 2024",
        form_id: "form_corolla_direct",
        field_data: [
          { name: "full_name", values: ["Camila Rodrigues"] },
          { name: "phone_number", values: ["11988889999"] },
          { name: "email", values: ["camila.rodrigues@globo.com"] },
          { name: "qual_veiculo", values: ["Toyota Corolla Hybrid"] },
        ],
      };

      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockGraphResponse,
      } as Response);

      const data = await fetchMetaLeadgenData("leadgen_graph_999", "EAAB_test_access_token_123");

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("https://graph.facebook.com/v20.0/leadgen_graph_999?access_token="),
        expect.any(Object)
      );
      expect(data).toEqual(mockGraphResponse);
      fetchSpy.mockRestore();
    });

    it("deve tratar erro 400 da Graph API (token expirado) de forma graciosa sem lançar exceção fatal", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: { message: "Session has expired", code: 190 } }),
      } as Response);

      const data = await fetchMetaLeadgenData("leadgen_expirado_123", "token_expirado");
      expect(data).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("processMetaLeadgen deve executar ciclo completo com sucesso e gerar short_code", async () => {
      const result = await processMetaLeadgen({
        leadgenId: "lead_proc_001",
        pageId: "page_test_123",
        directData: {
          name: "Lucas Teste Service",
          phone: "11977778888",
          email: "lucas@teste.com",
          vehicle: "Honda Civic Touring",
        },
      });

      expect(result.success).toBe(true);
      expect(result.clientName).toBe("Lucas Teste Service");
      expect(result.clientPhone).toBe("5511977778888");
      expect(result.shortCode).toBeDefined();
      expect(result.shortCode?.length).toBe(6);
      expect(result.assignedTo).toBeDefined();
    });
  });
});
