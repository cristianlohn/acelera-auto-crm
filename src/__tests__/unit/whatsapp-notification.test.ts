/**
 * @file whatsapp-notification.test.ts
 * @description Testes unitários para o serviço modular de notificações via WhatsApp e integração com a Roleta.
 *
 * Cenários Testados:
 * - [TEST-WHATSAPP-PHONE-SANITIZATION]: Sanitização e normalização de telefones para padrão E.164.
 * - [TEST-WHATSAPP-TEMPLATE-GENERATION]: Geração de templates limpos, links wa.me e CRM sem promessas estatísticas.
 * - [TEST-WHATSAPP-GRACEFUL-FALLBACK]: Tratamento tolerante a falhas (ausência de env vars, falhas HTTP, sem quebra de roleta).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sanitizeWhatsAppPhone,
  formatWhatsAppNumber,
  sendWhatsAppMessage,
  sendLeadNotificationToSeller,
} from "@/lib/services/whatsapp/client";
import {
  buildNewLeadAlertMessage,
  buildLeadNotificationMessage,
} from "@/lib/services/whatsapp/templates";
import {
  notifyAssignedSellerViaWhatsApp,
} from "@/lib/crm/roleta";
import * as supabaseServerModule from "@/lib/supabase/server";

describe("[UNIT-WHATSAPP] Serviço Modular de WhatsApp", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.WHATSAPP_API_URL;
    delete process.env.WHATSAPP_API_TOKEN;
    delete process.env.WHATSAPP_API_KEY;
    delete process.env.WHATSAPP_INSTANCE_TOKEN;
    delete process.env.WHATSAPP_PROVIDER;
    delete process.env.EVOLUTION_API_URL;
    delete process.env.EVOLUTION_API_KEY;
    delete process.env.EVOLUTION_API_TOKEN;
  });

  describe("[TEST-WHATSAPP-PHONE-SANITIZATION] Sanitização de Telefones", () => {
    it("deve formatar telefone celular de 11 dígitos com DDI 55", () => {
      expect(sanitizeWhatsAppPhone("(11) 98888-7777")).toBe("5511988887777");
      expect(sanitizeWhatsAppPhone("11999998888")).toBe("5511999998888");
      expect(sanitizeWhatsAppPhone(" 47 98765-4321 ")).toBe("5547987654321");
    });

    it("deve formatar telefone de 10 dígitos adicionando o 9º dígito para celulares", () => {
      expect(sanitizeWhatsAppPhone("(11) 8888-7777")).toBe("5511988887777");
      expect(sanitizeWhatsAppPhone("4787654321")).toBe("5547987654321");
    });

    it("deve preservar telefone que já possui DDI 55", () => {
      expect(sanitizeWhatsAppPhone("+55 (11) 99999-8888")).toBe("5511999998888");
      expect(sanitizeWhatsAppPhone("5547999991234")).toBe("5547999991234");
    });

    it("deve retornar string vazia para valores inválidos ou nulos", () => {
      expect(sanitizeWhatsAppPhone("")).toBe("");
      expect(sanitizeWhatsAppPhone("abc-xyz")).toBe("");
    });

    it("formatWhatsAppNumber deve adicionar 55 se ausente e limpar formatações rigorosamente", () => {
      expect(formatWhatsAppNumber("47999998888")).toBe("5547999998888");
      expect(formatWhatsAppNumber("(47) 98888-7777")).toBe("5547988887777");
      expect(formatWhatsAppNumber("+55 47 97777-6666")).toBe("5547977776666");
      expect(formatWhatsAppNumber("4788887777")).toBe("5547988887777");
    });
  });

  describe("[TEST-WHATSAPP-TEMPLATE-GENERATION] Geração de Template de Notificação", () => {
    it("deve gerar mensagem com dados do lead, link do CRM e wa.me sem promessas estatísticas", () => {
      const lead = {
        id: "lead_12345",
        name: "Carlos Alberto",
        phone: "(11) 97777-6666",
        interest_vehicle: "Jeep Compass 2023",
        source: "Webmotors",
      };

      const salesperson = {
        full_name: "Rafael Alves",
        phone: "11988887777",
      };

      const message = buildNewLeadAlertMessage(lead, salesperson, "https://aceleraautocrm.com.br");

      // Validações estruturais obrigatórias
      expect(message).toContain("🎯 *NOVO LEAD NA SUA VEZ - ACELERA AUTO*");
      expect(message).toContain("👤 *Cliente:* Carlos Alberto");
      expect(message).toContain("🚗 *Interesse:* Jeep Compass 2023");
      expect(message).toContain("📍 *Origem:* Webmotors");
      expect(message).toContain("📱 *Telefone:* (11) 97777-6666");
      expect(message).toContain("https://aceleraautocrm.com.br/leads?lead_id=lead_12345");
      expect(message).toContain("https://wa.me/5511977776666?text=");

      // Validação de compliance: ausência de estatísticas ou promessas fictícias de conversão
      expect(message).not.toContain("35%");
      expect(message).not.toContain("aumente sua conversão");
      expect(message).not.toContain("tempo recorde de");
    });

    it("deve fornecer fallbacks seguros quando campos opcionais do lead estiverem vazios", () => {
      const lead = {
        name: "",
        phone: "11988887777",
      };

      const salesperson = {};

      const message = buildNewLeadAlertMessage(lead, salesperson, "https://aceleraautocrm.com.br");

      expect(message).toContain("👤 *Cliente:* Cliente");
      expect(message).toContain("🚗 *Interesse:* Veículo de Interesse");
      expect(message).toContain("📍 *Origem:* Canal Digital");
      expect(message).toContain("https://aceleraautocrm.com.br/leads");
    });

    it("deve gerar links encurtados /c/[code] e /w/[code] quando short_code estiver presente", () => {
      const lead = {
        id: "lead_999",
        name: "Mariana Souza",
        phone: "(11) 98888-2222",
        interest_vehicle: "Toyota Corolla Cross",
        source: "Meta Ads",
        short_code: "k9Xp2A",
      };

      const salesperson = {
        full_name: "Lucas Mendes",
        phone: "11988887777",
      };

      const message = buildNewLeadAlertMessage(lead, salesperson, "https://aceleraautocrm.com.br");

      expect(message).toContain("https://aceleraautocrm.com.br/c/k9Xp2A");
      expect(message).toContain("https://aceleraautocrm.com.br/w/k9Xp2A");
    });

    it("buildLeadNotificationMessage deve gerar links estritos /c/[code] e /w/[code]", () => {
      const formatted = buildLeadNotificationMessage(
        {
          name: "João Silva",
          phone: "11988887777",
          vehicle_name: "Honda HR-V Touring 2024",
          source: "site",
          short_code: "h7Rt9Q",
        },
        "https://aceleraautocrm.com.br"
      );

      expect(formatted).toContain("🎯 *NOVO LEAD NA SUA VEZ - ACELERA AUTO*");
      expect(formatted).toContain("👤 *Cliente:* João Silva");
      expect(formatted).toContain("🚗 *Interesse:* Honda HR-V Touring 2024");
      expect(formatted).toContain("📍 *Origem:* site");
      expect(formatted).toContain("📱 *Telefone:* 11988887777");
      expect(formatted).toContain("https://aceleraautocrm.com.br/c/h7Rt9Q");
      expect(formatted).toContain("https://aceleraautocrm.com.br/w/h7Rt9Q");
      expect(formatted).not.toContain("https://wa.me/");
    });
  });

  describe("[TEST-WHATSAPP-GRACEFUL-FALLBACK] Fallback Gracioso e Resiliência", () => {
    it("deve executar em modo de simulação quando variáveis de ambiente não estiverem configuradas", async () => {
      delete process.env.WHATSAPP_API_URL;
      delete process.env.WHATSAPP_API_TOKEN;

      const result = await sendWhatsAppMessage({
        toPhone: "11988887777",
        messageText: "Teste de mensagem",
      });

      expect(result.success).toBe(true);
      expect(result.simulated).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it("deve registrar falha do gateway sem lançar erro quando a API retornar status 500", async () => {
      process.env.WHATSAPP_API_URL = "https://api.z-api.io/instances/test/token/send-text";
      process.env.WHATSAPP_API_TOKEN = "test-token";

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue("Internal Server Error on WhatsApp Gateway"),
      });

      const result = await sendWhatsAppMessage({
        toPhone: "11988887777",
        messageText: "Mensagem de alerta",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("HTTP 500");
    });

    it("notifyAssignedSellerViaWhatsApp nunca deve lançar exceção mesmo em caso de erro grave", async () => {
      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);
      vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockRejectedValue(
        new Error("Database connection lost")
      );

      const result = await notifyAssignedSellerViaWhatsApp({
        lead: {
          name: "João Silva",
          phone: "11999998888",
        },
        sellerName: "Rafael Alves",
      });

      expect(result).toBeDefined();
      expect(result.dispatched).toBe(true);
    });
  });

  describe("[TEST-WHATSAPP-PROVIDERS] Integração com Múltiplos Gateways HTTP", () => {
    it("deve despachar requisição formatada para provedor z-api com Client-Token e { phone, message }", async () => {
      process.env.WHATSAPP_API_URL = "https://api.z-api.io/instances/test-inst/token/test-tok/send-text";
      process.env.WHATSAPP_API_KEY = "zapi-secret-key-123";
      process.env.WHATSAPP_PROVIDER = "z-api";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: "zapi_msg_001" }),
      });
      global.fetch = mockFetch;

      const result = await sendWhatsAppMessage({
        toPhone: "(11) 98888-7777",
        messageText: "Olá consultor, novo lead atribuído!",
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe("production");
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.z-api.io/instances/test-inst/token/test-tok/send-text");
      expect(options.headers["Client-Token"]).toBe("zapi-secret-key-123");
      expect(options.headers["Authorization"]).toBe("Bearer zapi-secret-key-123");

      const body = JSON.parse(options.body);
      expect(body.phone).toBe("5511988887777");
      expect(body.message).toBe("Olá consultor, novo lead atribuído!");
    });

    it("deve despachar requisição formatada para provedor evolution com apikey e { number, text }", async () => {
      process.env.WHATSAPP_API_URL = "https://evolution.minhaloja.com.br/message/sendText/crm";
      process.env.WHATSAPP_API_KEY = "evolution-token-456";
      process.env.WHATSAPP_PROVIDER = "evolution";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ messageId: "evo_msg_999" }),
      });
      global.fetch = mockFetch;

      const result = await sendWhatsAppMessage({
        toPhone: "47987654321",
        messageText: "Aviso de novo lead na roleta",
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe("production");
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers["apikey"]).toBe("evolution-token-456");

      const body = JSON.parse(options.body);
      expect(body.number).toBe("5547987654321");
      expect(body.text).toBe("Aviso de novo lead na roleta");
    });

    it("deve montar endpoint canônico /message/sendText/{instanceName} e payload { number, text } para Evolution API v2", async () => {
      process.env.EVOLUTION_API_URL = "https://api-whatsapp.aceleraautocrm.com.br";
      process.env.EVOLUTION_API_KEY = "evo-key-live-123";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify({ key: { id: "evo_msg_canonical_1" } })),
      });
      global.fetch = mockFetch;

      const result = await sendWhatsAppMessage({
        toPhone: "47999998888",
        messageText: "🚨 *Novo Lead Atribuído!*\nCliente: João",
        tenantId: "bbbbbbbb-cccc-dddd-eeee-ffffffffffff",
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe("production");
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe(
        "https://api-whatsapp.aceleraautocrm.com.br/message/sendText/org_bbbbbbbb_cccc_dddd_eeee_ffffffffffff"
      );
      expect(options.headers["apikey"]).toBe("evo-key-live-123");
      expect(options.headers["Content-Type"]).toBe("application/json");

      const body = JSON.parse(options.body);
      expect(body).toEqual({
        number: "5547999998888",
        text: "🚨 *Novo Lead Atribuído!*\nCliente: João",
      });
    });
  });

  describe("[TEST-WHATSAPP-DEMO-PROTECTION] Proteção do Modo Demonstração", () => {
    it("deve operar em simulação sem disparar fetch quando isDemo === true mesmo com env vars preenchidas", async () => {
      process.env.WHATSAPP_API_URL = "https://api.z-api.io/instances/live/send-text";
      process.env.WHATSAPP_API_KEY = "live-production-key";

      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const result = await sendWhatsAppMessage({
        toPhone: "11988887777",
        messageText: "Lead simulado no modo demo",
        isDemo: true,
      });

      expect(result.success).toBe(true);
      expect(result.simulated).toBe(true);
      expect(result.mode).toBe("simulation");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("deve reconhecer tenant de demonstração padrão e evitar requisição de rede", async () => {
      process.env.WHATSAPP_API_URL = "https://api.z-api.io/instances/live/send-text";
      process.env.WHATSAPP_API_KEY = "live-production-key";

      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const result = await sendWhatsAppMessage({
        toPhone: "11988887777",
        messageText: "Lead simulado",
        tenantId: "a0000000-0000-0000-0000-000000000001",
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe("simulation");
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("[TEST-WHATSAPP-LEAD-ALERT] Envio de Alerta de Lead (sendLeadNotificationToSeller)", () => {
    it("deve montar mensagem formatada com SLA de 15 minutos e disparar envio", async () => {
      process.env.WHATSAPP_API_URL = "https://api.z-api.io/instances/test/token/test/send-text";
      process.env.WHATSAPP_API_KEY = "token-123";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: "msg_sla_001" }),
      });
      global.fetch = mockFetch;

      const result = await sendLeadNotificationToSeller({
        sellerPhone: "11988887777",
        sellerName: "Rafael Alves",
        leadName: "Roberto Carlos",
        leadPhone: "11977778888",
        vehicleInterest: "Honda HR-V Touring 2024",
        origin: "webmotors",
        leadId: "lead_sla_123",
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe("production");
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.message).toContain("🚨 *Novo Lead Atribuído!*");
      expect(body.message).toContain("👤 *Cliente:* Roberto Carlos");
      expect(body.message).toContain("🚗 *Interesse:* Honda HR-V Touring 2024");
      expect(body.message).toContain("⏱️ *SLA de Resposta:* 15 minutos");
      expect(body.message).toContain("/leads?lead_id=lead_sla_123");
    });
  });
});
