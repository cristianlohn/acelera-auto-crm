/**
 * @file short-routes.test.ts
 * @description Suíte de testes unitários para o gerador de short_code e rotas encurtadas /w/[code] e /c/[code].
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { generateShortCode } from "@/lib/utils/nanoid";
import { GET as handleWhatsAppShortRoute } from "@/app/w/[code]/route";
import { GET as handleCrmShortRoute } from "@/app/c/[code]/route";

let mockLeadRow: Record<string, unknown> | null = null;
let lastLeadUpdate: Record<string, unknown> | null = null;
let lastLeadHistoryInsert: Record<string, unknown> | null = null;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockImplementation(() => ({
    from: vi.fn().mockImplementation((table: string) => {
      const builder: Record<string, unknown> = {
        select: vi.fn(() => builder),
        eq: vi.fn((col: string, val: string) => {
          if (col === "short_code" && mockLeadRow && mockLeadRow.short_code === val) {
            return builder;
          }
          if (col === "short_code" && (!mockLeadRow || mockLeadRow.short_code !== val)) {
            return {
              single: vi.fn().mockResolvedValue({ data: null, error: new Error("Not found") }),
            };
          }
          return builder;
        }),
        single: vi.fn().mockImplementation(() =>
          Promise.resolve({
            data: mockLeadRow,
            error: mockLeadRow ? null : new Error("Not found"),
          })
        ),
        update: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
          lastLeadUpdate = payload;
          return {
            eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
          };
        }),
        insert: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
          if (table === "lead_history") {
            lastLeadHistoryInsert = payload;
          }
          return Promise.resolve({ data: {}, error: null });
        }),
      };
      return builder;
    }),
  })),
}));

describe("[UNIT-SHORT-ROUTES] Gerador de Short Code e Redirecionamento Encurtado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastLeadUpdate = null;
    lastLeadHistoryInsert = null;
    mockLeadRow = {
      id: "lead-qa-123",
      name: "Renato Silveira",
      phone: "(11) 98765-4321",
      vehicle_interest: "Honda Civic 2023",
      status: "novo",
      first_contact_at: null,
      organization_id: "org-loja-001",
      short_code: "k9Xp2A",
      custom_fields: {
        vehicle_name: "Honda Civic EXL 2023",
      },
    };
  });

  describe("1. Gerador de Código Curto (generateShortCode)", () => {
    it("[TEST-NANOID-1] deve gerar código de 6 caracteres por padrão", () => {
      const code = generateShortCode();
      expect(code).toHaveLength(6);
      expect(typeof code).toBe("string");
    });

    it("[TEST-NANOID-2] deve respeitar tamanho customizado e conter apenas caracteres seguros", () => {
      const code = generateShortCode(8);
      expect(code).toHaveLength(8);
      // Não deve conter 0, O, 1, I, l
      expect(code).toMatch(/^[2-9A-HJ-NP-Za-km-z]+$/);
    });
  });

  describe("2. Rota WhatsApp Encurtada (/w/[code])", () => {
    it("[TEST-ROUTE-W-1] deve retornar 404 quando o short_code não for encontrado", async () => {
      mockLeadRow = null;
      const req = new NextRequest("http://localhost:3000/w/INVALID");
      const res = await handleWhatsAppShortRoute(req, { params: Promise.resolve({ code: "INVALID" }) });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toContain("Lead não encontrado");
    });

    it("[TEST-ROUTE-W-2] deve redirecionar para wa.me e atualizar status/SLA para acesso humano real", async () => {
      const req = new NextRequest("http://localhost:3000/w/k9Xp2A", {
        headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)" },
      });
      const res = await handleWhatsAppShortRoute(req, { params: Promise.resolve({ code: "k9Xp2A" }) });

      expect(res.status).toBe(302);
      const location = res.headers.get("location");
      expect(location).toContain("https://wa.me/5511987654321?text=");
      expect(location).toContain("Renato");
      expect(location).toContain("Honda%20Civic%20EXL%202023");

      // Deve ter atualizado first_contact_at e status no banco
      expect(lastLeadUpdate).not.toBeNull();
      expect(lastLeadUpdate?.status).toBe("atendimento");
      expect(lastLeadUpdate?.first_contact_at).toBeDefined();

      // Deve ter inserido histórico de atendimento
      expect(lastLeadHistoryInsert).not.toBeNull();
      expect(lastLeadHistoryInsert?.action).toBe("first_contact_whatsapp_link");
    });

    it("[TEST-ROUTE-W-3] para robôs de preview (WhatsApp / Facebook crawler), deve redirecionar SEM pausar SLA", async () => {
      const req = new NextRequest("http://localhost:3000/w/k9Xp2A", {
        headers: { "user-agent": "WhatsApp/2.21.12.21 A" },
      });
      const res = await handleWhatsAppShortRoute(req, { params: Promise.resolve({ code: "k9Xp2A" }) });

      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toContain("https://wa.me/5511987654321");

      // Não deve ter mutado status no banco para crawler de preview
      expect(lastLeadUpdate).toBeNull();
      expect(lastLeadHistoryInsert).toBeNull();
    });
  });

  describe("3. Rota CRM Encurtada (/c/[code])", () => {
    it("[TEST-ROUTE-C-1] deve redirecionar para /leads?lead_id=[id] quando o short_code for válido", async () => {
      const req = new NextRequest("http://localhost:3000/c/k9Xp2A");
      const res = await handleCrmShortRoute(req, { params: Promise.resolve({ code: "k9Xp2A" }) });

      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toContain("/leads?lead_id=lead-qa-123");
    });

    it("[TEST-ROUTE-C-2] deve redirecionar para /leads quando o código não existir", async () => {
      mockLeadRow = null;
      const req = new NextRequest("http://localhost:3000/c/INEXISTENTE");
      const res = await handleCrmShortRoute(req, { params: Promise.resolve({ code: "INEXISTENTE" }) });

      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("https://aceleraautocrm.com.br/leads");
    });
  });
});
