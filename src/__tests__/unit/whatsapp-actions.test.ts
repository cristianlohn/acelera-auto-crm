/**
 * @file whatsapp-actions.test.ts
 * @description Suíte de testes unitários para as Server Actions de integração com WhatsApp (Evolution API v2).
 *
 * Cenários Testados:
 * - [TEST-WA-DEMO]: Operação segura em modo demonstração e fallback sem variáveis de ambiente.
 * - [TEST-WA-CONNECT]: Pareamento e geração de QR Code via Evolution API mockada.
 * - [TEST-WA-STATUS]: Consulta de status de conexão (open, connecting, close).
 * - [TEST-WA-DISCONNECT]: Desconexão/Logout seguro da instância.
 * - [TEST-WA-RESILIENCE]: Tolerância a falhas na API externa sem quebra da aplicação.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getWhatsAppStatusAction,
  connectWhatsAppAction,
  disconnectWhatsAppAction,
  resetWhatsAppDemoState,
} from "@/app/actions/whatsapp-actions";
import * as tenantModule from "@/lib/auth/tenant";
import * as supabaseServerModule from "@/lib/supabase/server";
import * as supabaseAdminModule from "@/lib/supabase/admin";

describe("[UNIT-WHATSAPP-ACTIONS] Integração WhatsApp (Evolution API v2)", () => {
  const TEST_ORG_ID = "11111111-2222-3333-4444-555555555555";
  const EXPECTED_INSTANCE = "org_11111111_2222_3333_4444_555555555555";

  beforeEach(() => {
    vi.restoreAllMocks();
    resetWhatsAppDemoState();
    delete process.env.EVOLUTION_API_URL;
    delete process.env.EVOLUTION_API_KEY;
    delete process.env.EVOLUTION_API_TOKEN;
  });

  describe("[TEST-WA-DEMO] Modo Demonstração & Fallback sem Credenciais", () => {
    it("deve retornar status desconectado simulado quando no modo demo", async () => {
      vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
        isDemo: true,
        userId: "demo-user",
        organizationId: tenantModule.DEFAULT_DEMO_ORG_ID,
        profile: null,
        organization: null,
        needsOnboarding: false,
      });

      const res = await getWhatsAppStatusAction();
      expect(res.success).toBe(true);
      expect(res.connected).toBe(false);
      expect(res.status).toBe("disconnected");
      expect(res.simulated).toBe(true);
    });

    it("deve gerar QR code simulado ao conectar no modo demo", async () => {
      vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
        isDemo: true,
        userId: "demo-user",
        organizationId: tenantModule.DEFAULT_DEMO_ORG_ID,
        profile: null,
        organization: null,
        needsOnboarding: false,
      });

      const res = await connectWhatsAppAction();
      expect(res.success).toBe(true);
      expect(res.status).toBe("connecting");
      expect(res.qrCode).toContain("data:image/");
      expect(res.simulated).toBe(true);

      // Status posterior deve refletir o estado de connecting
      const statusRes = await getWhatsAppStatusAction();
      expect(statusRes.status).toBe("connecting");
      expect(statusRes.qrCode).toBeDefined();
    });

    it("deve desconectar limpando o QR code simulado no modo demo", async () => {
      vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
        isDemo: true,
        userId: "demo-user",
        organizationId: tenantModule.DEFAULT_DEMO_ORG_ID,
        profile: null,
        organization: null,
        needsOnboarding: false,
      });

      // Primeiro conecta
      await connectWhatsAppAction();

      // Depois desconecta
      const disRes = await disconnectWhatsAppAction();
      expect(disRes.success).toBe(true);
      expect(disRes.disconnected).toBe(true);
      expect(disRes.status).toBe("disconnected");

      const statusRes = await getWhatsAppStatusAction();
      expect(statusRes.status).toBe("disconnected");
      expect(statusRes.qrCode).toBeNull();
    });
  });

  describe("[TEST-WA-PRODUCTION] Integração Real com Evolution API (Mockada)", () => {
    beforeEach(() => {
      process.env.EVOLUTION_API_URL = "https://api-whatsapp.aceleraautocrm.com.br";
      process.env.EVOLUTION_API_KEY = "test-secret-evolution-key";

      vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
        isDemo: false,
        userId: "real-user-123",
        organizationId: TEST_ORG_ID,
        profile: {
          id: "real-user-123",
          organization_id: TEST_ORG_ID,
          full_name: "Gestor Loja",
          role: "admin",
          email: "gestor@loja.com",
          phone: "11999998888",
          avatar_url: null,
          created_at: "",
          updated_at: "",
        },
        organization: null,
        needsOnboarding: false,
      });

      vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(true);

      const mockAdmin = {
        from: vi.fn().mockReturnValue({
          upsert: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
      vi.spyOn(supabaseAdminModule, "createAdminClient").mockReturnValue(
        mockAdmin as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>
      );
    });

    it("connectWhatsAppAction deve criar instância e obter QR Code via Evolution API", async () => {
      const mockFetch = vi.fn().mockImplementation((url: string, opts: RequestInit) => {
        if (url.includes("/instance/create")) {
          expect(opts.headers).toHaveProperty("apikey", "test-secret-evolution-key");
          const body = JSON.parse(opts.body as string);
          expect(body.instanceName).toBe(EXPECTED_INSTANCE);
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ instance: { instanceName: EXPECTED_INSTANCE } }),
          });
        }
        if (url.includes(`/instance/connect/${EXPECTED_INSTANCE}`)) {
          expect(opts.headers).toHaveProperty("apikey", "test-secret-evolution-key");
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                pairingCode: "PAIR-1234",
              }),
          });
        }
        return Promise.reject(new Error(`URL não esperada: ${url}`));
      });
      global.fetch = mockFetch;

      const res = await connectWhatsAppAction();

      expect(res.success).toBe(true);
      expect(res.status).toBe("connecting");
      expect(res.instanceName).toBe(EXPECTED_INSTANCE);
      expect(res.qrCode).toContain("data:image/png;base64,");
      expect(res.pairingCode).toBe("PAIR-1234");
      expect(res.simulated).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("getWhatsAppStatusAction deve consultar estado 'open' e retornar status connected", async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes(`/instance/connectionState/${EXPECTED_INSTANCE}`)) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ instance: { state: "open" } }),
          });
        }
        return Promise.reject(new Error("URL desconhecida"));
      });
      global.fetch = mockFetch;

      const res = await getWhatsAppStatusAction();

      expect(res.success).toBe(true);
      expect(res.connected).toBe(true);
      expect(res.status).toBe("connected");
      expect(res.instanceName).toBe(EXPECTED_INSTANCE);
    });

    it("disconnectWhatsAppAction deve acionar DELETE /instance/logout na Evolution API", async () => {
      const mockFetch = vi.fn().mockImplementation((url: string, opts: RequestInit) => {
        if (url.includes(`/instance/logout/${EXPECTED_INSTANCE}`)) {
          expect(opts.method).toBe("DELETE");
          expect(opts.headers).toHaveProperty("apikey", "test-secret-evolution-key");
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: "SUCCESS" }),
          });
        }
        return Promise.reject(new Error("URL desconhecida"));
      });
      global.fetch = mockFetch;

      const res = await disconnectWhatsAppAction();

      expect(res.success).toBe(true);
      expect(res.disconnected).toBe(true);
      expect(res.status).toBe("disconnected");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("deve tratar erros de rede da Evolution API graciosamente sem lançar exceção", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Failed to connect to gateway"));

      const res = await connectWhatsAppAction();
      expect(res.success).toBe(false);
      expect(res.status).toBe("disconnected");
      expect(res.error).toBeDefined();
    });
  });
});
