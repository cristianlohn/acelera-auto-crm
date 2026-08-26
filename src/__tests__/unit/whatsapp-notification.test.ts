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
  sendWhatsAppMessage,
} from "@/lib/services/whatsapp/client";
import {
  buildNewLeadAlertMessage,
} from "@/lib/services/whatsapp/templates";
import {
  notifyAssignedSellerViaWhatsApp,
} from "@/lib/crm/roleta";
import * as supabaseServerModule from "@/lib/supabase/server";

describe("[UNIT-WHATSAPP] Serviço Modular de WhatsApp", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
});
