/**
 * @file whatsapp-actions.ts
 * @description Server Actions para integração do WhatsApp via Evolution API v2.
 *
 * Suporta arquitetura Dual-Engine:
 * 1. Modo Demo / Ausência de Credenciais: Simulação síncrona sem disparar erros HTTP reais.
 * 2. Produção (Evolution API): Criação de instância, geração de QR Code, verificação de status e desconexão.
 */

"use server";

import fs from "fs";
import path from "path";
import { resolveUserTenantContext, DEFAULT_DEMO_ORG_ID } from "@/lib/auth/tenant";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";

export type WhatsAppInstanceStatus = "connected" | "connecting" | "disconnected";

/**
 * Obtém as credenciais da Evolution API do process.env ou diretamente do env.local (fallback seguro para runtime de dev).
 */
function getEvolutionCredentials() {
  let url = process.env.EVOLUTION_API_URL || process.env.WHATSAPP_API_URL;
  let key =
    process.env.EVOLUTION_API_KEY ||
    process.env.EVOLUTION_API_TOKEN ||
    process.env.WHATSAPP_API_KEY;

  // Em ambiente de testes automatizados, respeitar estritamente o process.env mockado pelos testes
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return {
      evolutionUrl: url?.replace(/\/$/, "") || null,
      evolutionKey: key || null,
    };
  }

  if (!url || !key) {
    try {
      const candidates = [
        path.resolve(process.cwd(), "env.local"),
        path.resolve(process.cwd(), ".env.local"),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          const content = fs.readFileSync(candidate, "utf8");
          const urlMatch = content.match(/EVOLUTION_API_URL=(.+)/);
          const keyMatch = content.match(/EVOLUTION_API_KEY=(.+)/);
          if (urlMatch && !url) url = urlMatch[1].trim().replace(/['"]/g, "");
          if (keyMatch && !key) key = keyMatch[1].trim().replace(/['"]/g, "");
          if (url && key) break;
        }
      }
    } catch {
      // Ignora erro de leitura em produção na nuvem
    }
  }

  return {
    evolutionUrl: url?.replace(/\/$/, "") || null,
    evolutionKey: key || null,
  };
}

export interface WhatsAppStatusResult {
  success: boolean;
  connected: boolean;
  status: WhatsAppInstanceStatus;
  instanceName: string;
  qrCode?: string | null;
  phoneNumber?: string | null;
  error?: string;
  simulated?: boolean;
}

export interface WhatsAppConnectResult {
  success: boolean;
  status: WhatsAppInstanceStatus;
  instanceName: string;
  qrCode?: string | null;
  pairingCode?: string | null;
  error?: string;
  simulated?: boolean;
}

export interface WhatsAppDisconnectResult {
  success: boolean;
  disconnected: boolean;
  status: WhatsAppInstanceStatus;
  error?: string;
  simulated?: boolean;
}

/** SVG Base64 de QR Code para exibição visual no modo demo/simulado */
const DEMO_QR_CODE_BASE64 =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200' width='200' height='200'><rect width='200' height='200' fill='white'/><rect x='20' y='20' width='50' height='50' fill='black'/><rect x='30' y='30' width='30' height='30' fill='white'/><rect x='130' y='20' width='50' height='50' fill='black'/><rect x='140' y='30' width='30' height='30' fill='white'/><rect x='20' y='130' width='50' height='50' fill='black'/><rect x='30' y='140' width='30' height='30' fill='white'/><rect x='85' y='35' width='30' height='30' fill='black'/><rect x='85' y='85' width='30' height='30' fill='black'/><rect x='35' y='85' width='30' height='30' fill='black'/><rect x='135' y='85' width='30' height='30' fill='black'/><rect x='135' y='135' width='30' height='30' fill='black'/><rect x='85' y='135' width='30' height='30' fill='black'/></svg>";

/** Estado em memória compartilhado para sessões no modo demonstração */
let demoState: {
  status: WhatsAppInstanceStatus;
  connected: boolean;
  qrCode: string | null;
} = {
  status: "disconnected",
  connected: false,
  qrCode: null,
};

export async function resetWhatsAppDemoState(): Promise<void> {
  demoState = {
    status: "disconnected",
    connected: false,
    qrCode: null,
  };
}

/**
 * Normaliza o QR Code retornado pela Evolution API para formato Data URI utilizável na tag <img>.
 */
function normalizeQrCode(rawBase64?: string | null): string | null {
  if (!rawBase64) return null;
  const trimmed = rawBase64.trim();
  if (trimmed.startsWith("data:image")) return trimmed;
  if (/^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length > 50) {
    return `data:image/png;base64,${trimmed}`;
  }
  if (trimmed.startsWith("<svg") || trimmed.includes("<svg")) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(trimmed)}`;
  }
  return trimmed;
}

/**
 * Consulta o status atual de conexão do WhatsApp da organização.
 */
export async function getWhatsAppStatusAction(): Promise<WhatsAppStatusResult> {
  try {
    const tenantContext = await resolveUserTenantContext();
    const isDemo = tenantContext.isDemo;
    const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;
    const instanceName = `org_${orgId.replace(/-/g, "_")}`;

    const { evolutionUrl, evolutionKey } = getEvolutionCredentials();

    // 1. Se credenciais não estiverem configuradas, fallback direto para simulação
    if (!evolutionUrl || !evolutionKey) {
      console.log(
        "[WhatsApp API - Status Fallback] Credenciais da Evolution API ausentes no ambiente. Usando status simulado."
      );
      return {
        success: true,
        connected: demoState.connected,
        status: demoState.status,
        instanceName: "org_demo_sandbox",
        qrCode: demoState.qrCode,
        simulated: true,
      };
    }

    // 2. Produção: Consulta estado de conexão na Evolution API
    try {
      const response = await fetch(
        `${evolutionUrl}/instance/connectionState/${instanceName}`,
        {
          method: "GET",
          headers: {
            apikey: evolutionKey,
          },
          cache: "no-store",
        }
      );

      let responseBody = "";
      let data: Record<string, unknown> = {};
      if (typeof response.text === "function") {
        responseBody = await response.text().catch(() => "");
        try {
          data = JSON.parse(responseBody);
        } catch {
          data = {};
        }
      } else if (typeof response.json === "function") {
        data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        responseBody = JSON.stringify(data);
      }
      console.log(`[WhatsApp API - Status Response] status: ${response.status}`, responseBody);

      if (response.ok) {

        const rawState =
          (data?.instance as Record<string, unknown>)?.state ||
          data?.state ||
          "close";

        const isConnected = rawState === "open";
        const status: WhatsAppInstanceStatus = isConnected
          ? "connected"
          : rawState === "connecting"
          ? "connecting"
          : "disconnected";

        // Persistência defensiva no Supabase
        if (isSupabaseServerConfigured()) {
          try {
            const admin = createAdminClient();
            await (admin.from("whatsapp_instances") as unknown as { upsert: (data: Record<string, unknown>) => Promise<unknown> })
              .upsert({
                organization_id: orgId,
                instance_name: instanceName,
                status,
                updated_at: new Date().toISOString(),
              });
          } catch (dbErr) {
            console.warn("[whatsapp-actions] Falha ao persistir status no Supabase:", dbErr);
          }
        }

        return {
          success: true,
          connected: isConnected,
          status,
          instanceName,
          simulated: false,
        };
      }
    } catch (apiErr) {
      console.error("[WhatsApp API - Status Error] Erro ao consultar VPS:", apiErr);
      if (isDemo) {
        return {
          success: true,
          connected: demoState.connected,
          status: demoState.status,
          instanceName: "org_demo_sandbox",
          qrCode: demoState.qrCode,
          simulated: true,
        };
      }
    }

    // Fallback se a instância ainda não existir no gateway
    return {
      success: true,
      connected: isDemo ? demoState.connected : false,
      status: isDemo ? demoState.status : "disconnected",
      instanceName,
      qrCode: isDemo ? demoState.qrCode : null,
      simulated: isDemo,
    };
  } catch (err) {
    console.error("[getWhatsAppStatusAction Error]", err);
    return {
      success: false,
      connected: false,
      status: "disconnected",
      instanceName: "unknown",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Inicia o pareamento do WhatsApp gerando uma nova instância ou requisitando o QR Code.
 */
export async function connectWhatsAppAction(): Promise<WhatsAppConnectResult> {
  try {
    const tenantContext = await resolveUserTenantContext();
    const isDemo = tenantContext.isDemo;
    const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;
    const instanceName = `org_${orgId.replace(/-/g, "_")}`;

    const { evolutionUrl, evolutionKey } = getEvolutionCredentials();

    console.log("[WhatsApp API] Conectando...", {
      url: evolutionUrl,
      hasKey: !!evolutionKey,
      isDemo,
      instanceName,
    });

    // 1. Fallback se as variáveis de ambiente não estiverem configuradas
    if (!evolutionUrl || !evolutionKey) {
      console.log(
        "[WhatsApp API - Fallback] Variáveis EVOLUTION_API_URL ou EVOLUTION_API_KEY ausentes no ambiente. Acionando fallback do Modo Demo."
      );
      demoState = {
        status: "connecting",
        connected: false,
        qrCode: DEMO_QR_CODE_BASE64,
      };

      return {
        success: true,
        status: "connecting",
        instanceName: "org_demo_sandbox",
        qrCode: DEMO_QR_CODE_BASE64,
        pairingCode: "DEMO-7788",
        simulated: true,
      };
    }

    // 2. Produção: Tenta conectar com a Evolution API na VPS
    try {
      console.log(
        `[WhatsApp API] Criando/Verificando instância: ${instanceName} em ${evolutionUrl}/instance/create...`
      );
      const createRes = await fetch(`${evolutionUrl}/instance/create`, {
        method: "POST",
        headers: {
          apikey: evolutionKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        }),
      });

      let createBody = "";
      if (typeof createRes.text === "function") {
        createBody = await createRes.text().catch(() => "");
      } else if (typeof createRes.json === "function") {
        createBody = JSON.stringify(await createRes.json().catch(() => ({})));
      }
      console.log(`[WhatsApp API] Resposta /instance/create: status ${createRes.status}`, createBody);

      // 3. Obtenção do QR Code para conexão
      console.log(`[WhatsApp API] Solicitando QR Code em ${evolutionUrl}/instance/connect/${instanceName}...`);
      const connectResponse = await fetch(
        `${evolutionUrl}/instance/connect/${instanceName}`,
        {
          method: "GET",
          headers: {
            apikey: evolutionKey,
          },
          cache: "no-store",
        }
      );

      let connectBody = "";
      let dataConnect: Record<string, unknown> = {};
      if (typeof connectResponse.text === "function") {
        connectBody = await connectResponse.text().catch(() => "");
        try {
          dataConnect = JSON.parse(connectBody);
        } catch {
          dataConnect = {};
        }
      } else if (typeof connectResponse.json === "function") {
        dataConnect = (await connectResponse.json().catch(() => ({}))) as Record<string, unknown>;
        connectBody = JSON.stringify(dataConnect);
      }
      console.log(`[WhatsApp API] Resposta /instance/connect: status ${connectResponse.status}`, connectBody);

      // Tratar os múltiplos formatos da Evolution API v2:
      // - dataConnect?.base64
      // - dataConnect?.qrcode?.base64
      // - dataConnect?.code
      const rawQr =
        (dataConnect?.base64 as string) ||
        ((dataConnect?.qrcode as Record<string, unknown>)?.base64 as string) ||
        (dataConnect?.code as string) ||
        ((dataConnect?.qrcode as Record<string, unknown>)?.code as string) ||
        null;

      const pairingCode =
        (dataConnect?.pairingCode as string) ||
        ((dataConnect?.qrcode as Record<string, unknown>)?.pairingCode as string) ||
        null;

      if (connectResponse.ok && rawQr) {
        const normalizedQr = normalizeQrCode(rawQr);
        console.log("[WhatsApp API] QR Code parseado com sucesso da Evolution API!");

        // Persistência defensiva no Supabase
        if (isSupabaseServerConfigured()) {
          try {
            const admin = createAdminClient();
            await (admin.from("whatsapp_instances") as unknown as { upsert: (data: Record<string, unknown>) => Promise<unknown> })
              .upsert({
                organization_id: orgId,
                instance_name: instanceName,
                status: "connecting",
                qr_code: normalizedQr,
                updated_at: new Date().toISOString(),
              });
          } catch (dbErr) {
            console.warn("[whatsapp-actions] Falha ao persistir QR Code no banco:", dbErr);
          }
        }

        return {
          success: true,
          status: "connecting",
          instanceName,
          qrCode: normalizedQr,
          pairingCode,
          simulated: false,
        };
      }

      console.warn(
        `[WhatsApp API] Não foi possível extrair QR Code válido (Status ${connectResponse.status}). Body:`,
        connectBody
      );

      // Se estiver em sessão demo e a VPS não retornar QR Code, aciona fallback amigável
      if (isDemo) {
        console.log(
          "[WhatsApp API - Fallback] Chamada à VPS não retornou QR Code durante sessão demo. Usando fallback de demonstração para não quebrar a tela."
        );
        demoState = {
          status: "connecting",
          connected: false,
          qrCode: DEMO_QR_CODE_BASE64,
        };
        return {
          success: true,
          status: "connecting",
          instanceName: "org_demo_sandbox",
          qrCode: DEMO_QR_CODE_BASE64,
          pairingCode: "DEMO-7788",
          simulated: true,
        };
      }

      return {
        success: false,
        status: "disconnected",
        instanceName,
        error: `Erro ao obter QR Code (${connectResponse.status}): ${connectBody || "Resposta inválida"}`,
      };
    } catch (error) {
      console.error("[WhatsApp API] Erro ao conectar na VPS:", error);

      if (isDemo) {
        console.log(
          "[WhatsApp API - Fallback] Exceção de rede ao conectar na VPS durante sessão demo. Acionando simulação defensiva."
        );
        demoState = {
          status: "connecting",
          connected: false,
          qrCode: DEMO_QR_CODE_BASE64,
        };

        return {
          success: true,
          status: "connecting",
          instanceName: "org_demo_sandbox",
          qrCode: DEMO_QR_CODE_BASE64,
          pairingCode: "DEMO-7788",
          simulated: true,
        };
      }

      return {
        success: false,
        status: "disconnected",
        instanceName,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  } catch (err) {
    console.error("[connectWhatsAppAction Error]", err);
    return {
      success: false,
      status: "disconnected",
      instanceName: "unknown",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Desconecta a instância do WhatsApp (logout).
 */
export async function disconnectWhatsAppAction(): Promise<WhatsAppDisconnectResult> {
  try {
    const tenantContext = await resolveUserTenantContext();
    const isDemo = tenantContext.isDemo;
    const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;
    const instanceName = `org_${orgId.replace(/-/g, "_")}`;

    const { evolutionUrl, evolutionKey } = getEvolutionCredentials();

    // 1. Modo Demonstração / Simulação
    if (!evolutionUrl || !evolutionKey) {
      demoState = {
        status: "disconnected",
        connected: false,
        qrCode: null,
      };

      return {
        success: true,
        disconnected: true,
        status: "disconnected",
        simulated: true,
      };
    }

    // 2. Produção: Logout na Evolution API
    try {
      await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
        method: "DELETE",
        headers: {
          apikey: evolutionKey,
        },
      });
    } catch (logoutErr) {
      console.warn("[whatsapp-actions] Erro ao deslogar na Evolution API:", logoutErr);
    }

    // Atualização no Supabase
    if (isSupabaseServerConfigured()) {
      try {
        const admin = createAdminClient();
        await (admin.from("whatsapp_instances") as unknown as { upsert: (data: Record<string, unknown>) => Promise<unknown> })
          .upsert({
            organization_id: orgId,
            instance_name: instanceName,
            status: "disconnected",
            qr_code: null,
            updated_at: new Date().toISOString(),
          });
      } catch (dbErr) {
        console.warn("[whatsapp-actions] Falha ao atualizar desconexão no Supabase:", dbErr);
      }
    }

    return {
      success: true,
      disconnected: true,
      status: "disconnected",
      simulated: false,
    };
  } catch (err) {
    console.error("[disconnectWhatsAppAction Error]", err);
    return {
      success: false,
      disconnected: false,
      status: "disconnected",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
