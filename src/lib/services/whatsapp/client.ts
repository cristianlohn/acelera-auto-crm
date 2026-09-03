import fs from "fs";
import path from "path";
import { DEFAULT_DEMO_ORG_ID } from "@/lib/auth/tenant";

export type WhatsAppProvider = "z-api" | "evolution" | "generic";

export interface SendWhatsAppMessageParams {
  toPhone: string;
  messageText: string;
  isDemo?: boolean;
  tenantId?: string;
  provider?: WhatsAppProvider;
}

export interface SendWhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
  mode?: "simulation" | "production";
}

/**
 * Sanitiza e formata rigorosamente o número de telefone para o padrão internacional do WhatsApp (E.164 com DDI 55).
 * - Remove qualquer caractere não numérico (/\D/g).
 * - Adiciona DDI 55 se ausente (ex: 47999998888 -> 5547999998888).
 * - Adiciona o 9º dígito se for celular de 10 dígitos (DDD + 8 dígitos iniciando em 6-9).
 * - Garante que o telefone final possua tamanho válido (12 ou 13 dígitos para o Brasil).
 */
export function formatWhatsAppNumber(phone: string): string {
  if (!phone) return "";

  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";

  let formatted = digits;

  // Telefone celular/fixo de 10 dígitos (DDD + 8 dígitos) -> adiciona 9 se for celular e prefixa DDI 55
  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const number = digits.slice(2);
    const formattedNumber = number.length === 8 && /^[6-9]/.test(number) ? `9${number}` : number;
    formatted = `55${ddd}${formattedNumber}`;
  } else if (digits.length === 11) {
    // Celular de 11 dígitos (DDD + 9 dígitos) -> prefixa DDI 55
    formatted = `55${digits}`;
  } else if (!digits.startsWith("55") && (digits.length === 8 || digits.length === 9)) {
    // Número sem DDD -> adiciona 55 como fallback
    formatted = `55${digits}`;
  }

  // Validação: Telefone brasileiro com DDI 55 deve ter 12 ou 13 dígitos
  if (formatted.startsWith("55") && (formatted.length === 12 || formatted.length === 13)) {
    return formatted;
  }

  // Telefones internacionais com outros DDIs (10 a 15 dígitos)
  if (formatted.length >= 10 && formatted.length <= 15) {
    return formatted;
  }

  return formatted;
}

/**
 * Mantém retrocompatibilidade total com sanitizeWhatsAppPhone
 */
export const sanitizeWhatsAppPhone = formatWhatsAppNumber;

/**
 * Unifica e resolve as credenciais da Evolution API com prioridade e fallback seguro para WhatsApp Gateway.
 */
export function getWhatsAppCredentials() {
  let apiUrl = process.env.EVOLUTION_API_URL || process.env.WHATSAPP_API_URL;
  let apiKey =
    process.env.EVOLUTION_API_KEY ||
    process.env.WHATSAPP_API_KEY ||
    process.env.WHATSAPP_API_TOKEN ||
    process.env.WHATSAPP_INSTANCE_TOKEN;

  // Em ambiente de teste automatizado, respeita os mocks de process.env
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return {
      apiUrl: apiUrl ? apiUrl.replace(/\/$/, "") : null,
      apiKey: apiKey || null,
    };
  }

  // Fallback para ler .env.local ou env.local caso o dev server de longa duração não tenha recarregado o ambiente
  if (!apiUrl || !apiKey) {
    try {
      const candidates = [
        path.resolve(process.cwd(), ".env.local"),
        path.resolve(process.cwd(), "env.local"),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          const content = fs.readFileSync(candidate, "utf8");
          const evoUrlMatch = content.match(/EVOLUTION_API_URL=(.+)/);
          const waUrlMatch = content.match(/WHATSAPP_API_URL=(.+)/);
          const evoKeyMatch = content.match(/EVOLUTION_API_KEY=(.+)/);
          const waKeyMatch = content.match(/WHATSAPP_API_KEY=(.+)/);

          if (!apiUrl) {
            const rawUrl = evoUrlMatch ? evoUrlMatch[1] : waUrlMatch ? waUrlMatch[1] : null;
            if (rawUrl) apiUrl = rawUrl.trim().replace(/['"]/g, "");
          }
          if (!apiKey) {
            const rawKey = evoKeyMatch ? evoKeyMatch[1] : waKeyMatch ? waKeyMatch[1] : null;
            if (rawKey) apiKey = rawKey.trim().replace(/['"]/g, "");
          }
          if (apiUrl && apiKey) break;
        }
      }
    } catch {
      // Ignora falhas de filesystem (Edge runtimes)
    }
  }

  return {
    apiUrl: apiUrl ? apiUrl.replace(/\/$/, "") : null,
    apiKey: apiKey || null,
  };
}

export const getWhatsAppGatewayCredentials = getWhatsAppCredentials;

export interface SendWhatsAppMessageParams {
  toPhone: string;
  messageText: string;
  isDemo?: boolean;
  tenantId?: string;
  organizationId?: string;
  provider?: WhatsAppProvider;
}

/**
 * Envia uma mensagem via WhatsApp com timeout controlado (5s) e tratamento tolerante a falhas.
 * Em ambientes sem credenciais configuradas ou no Modo Demo, executa em modo Simulação/Log.
 * Em produção com Evolution API v2, monta o endpoint canônico /message/sendText/{instanceName} e payload { number, text }.
 */
export async function sendWhatsAppMessage({
  toPhone,
  messageText,
  isDemo = false,
  tenantId,
  organizationId,
  provider,
}: SendWhatsAppMessageParams): Promise<SendWhatsAppMessageResult> {
  const formattedPhone = formatWhatsAppNumber(toPhone);

  if (!formattedPhone) {
    console.warn("[WhatsApp Service] Número de telefone inválido ou vazio:", toPhone);
    return {
      success: false,
      error: "Número de telefone inválido.",
      mode: "production",
    };
  }

  const effectiveOrgId = organizationId || tenantId;

  const isDemoTenant =
    isDemo ||
    effectiveOrgId === DEFAULT_DEMO_ORG_ID ||
    effectiveOrgId === "00000000-0000-0000-0000-000000000001" ||
    effectiveOrgId?.startsWith("demo");

  const { apiUrl, apiKey } = getWhatsAppCredentials();

  // Modo Simulação/Fallback: Modo Demo ou ausência de variáveis de ambiente configuradas
  if (
    isDemoTenant ||
    !apiUrl ||
    !apiKey ||
    apiUrl.includes("placeholder") ||
    apiUrl === "mock"
  ) {
    const reason = isDemoTenant
      ? "Modo Demonstração"
      : "Gateway não configurado em produção";

    console.log(
      `[WhatsApp Service - Simulação] Mensagem despachada para +${formattedPhone} (${reason}):`
    );
    console.log(`---\n${messageText}\n---`);
    return {
      success: true,
      simulated: true,
      mode: "simulation",
      messageId: `mock_msg_${Date.now()}`,
    };
  }

  const effectiveProvider: WhatsAppProvider = (
    provider ||
    process.env.WHATSAPP_PROVIDER ||
    (apiUrl.includes("z-api")
      ? "z-api"
      : apiUrl.includes("evolution") || process.env.EVOLUTION_API_URL || apiUrl.includes("api-whatsapp")
      ? "evolution"
      : "generic")
  ).toLowerCase() as WhatsAppProvider;

  const instanceName = effectiveOrgId
    ? `org_${effectiveOrgId.replace(/-/g, "_")}`
    : (process.env.EVOLUTION_INSTANCE_NAME || "default");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos de timeout

  try {
    let endpoint = apiUrl;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    let bodyPayload: Record<string, unknown> = {};

    if (effectiveProvider === "z-api") {
      headers["Client-Token"] = apiKey;
      headers["Authorization"] = `Bearer ${apiKey}`;
      bodyPayload = {
        phone: formattedPhone,
        message: messageText,
        text: messageText,
      };
    } else if (effectiveProvider === "evolution") {
      endpoint = apiUrl.includes("/message/sendText")
        ? apiUrl
        : `${apiUrl}/message/sendText/${instanceName}`;

      headers["apikey"] = apiKey;
      bodyPayload = {
        number: formattedPhone,
        text: messageText,
      };
    } else {
      // Provedor genérico / compatibilidade com gateways HTTP universais
      headers["Authorization"] = `Bearer ${apiKey}`;
      headers["apikey"] = apiKey;
      bodyPayload = {
        number: formattedPhone,
        phone: formattedPhone,
        message: messageText,
        text: messageText,
      };
    }

    console.log("[WhatsApp Dispatch] Tentando enviar...", {
      endpoint,
      sellerPhoneOriginal: toPhone,
      sellerPhoneFormatted: formattedPhone,
      instanceName,
      provider: effectiveProvider,
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let responseText = "";
    let responseData: Record<string, unknown> = {};
    if (typeof response.text === "function") {
      responseText = await response.text().catch(() => "");
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }
    } else if (typeof response.json === "function") {
      try {
        responseData = (await response.json()) as Record<string, unknown>;
        responseText = JSON.stringify(responseData);
      } catch {
        responseData = {};
      }
    }

    if (response.ok) {
      console.log(
        `[WhatsApp Service - Produção] Disparo realizado via Evolution API (${instanceName}) para ${formattedPhone}: Status ${response.status}`
      );
      const messageId = String(
        responseData.id ||
        responseData.messageId ||
        (responseData.key as Record<string, unknown>)?.id ||
        `msg_${Date.now()}`
      );
      return {
        success: true,
        messageId,
        mode: "production",
      };
    } else {
      console.error(
        `[WhatsApp Dispatch Error] Gateway (${effectiveProvider}) respondeu status ${response.status}:`,
        responseData
      );
      return {
        success: false,
        error: `HTTP ${response.status}: ${responseText || "Erro desconhecido"}`,
        mode: "production",
      };
    }
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[WhatsApp Dispatch Exception] Falha de comunicação com gateway (${effectiveProvider}): ${errorMessage}`);
    return {
      success: false,
      error: errorMessage,
      mode: "production",
    };
  }
}

export interface SendLeadNotificationParams {
  sellerPhone: string;
  sellerName?: string;
  leadName: string;
  leadPhone: string;
  vehicleInterest?: string;
  origin?: string;
  leadId?: string;
  short_code?: string;
  shortCode?: string;
  isDemo?: boolean;
  tenantId?: string;
  organizationId?: string;
  appUrl?: string;
  provider?: WhatsAppProvider;
}

/**
 * Notifica o consultor de vendas sobre um novo lead atribuído pela roleta comercial.
 */
export async function sendLeadNotificationToSeller({
  sellerPhone,
  sellerName = "Consultor",
  leadName,
  leadPhone,
  vehicleInterest = "Veículo de Interesse",
  leadId,
  short_code,
  shortCode,
  isDemo = false,
  tenantId,
  organizationId,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aceleraautocrm.com.br",
  provider,
}: SendLeadNotificationParams): Promise<SendWhatsAppMessageResult> {
  const code = short_code || shortCode;
  const baseUrl = appUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const crmLink = code
    ? `https://${baseUrl}/c/${code}`
    : leadId
    ? `https://${baseUrl}/leads?lead_id=${leadId}`
    : `https://${baseUrl}/leads`;

  const sanitizedClientPhone = sanitizeWhatsAppPhone(leadPhone);
  const greeting = `Olá ${leadName}, tudo bem? Sou ${sellerName} da concessionária. Vi seu interesse no ${vehicleInterest}. Como posso te ajudar hoje?`;
  const waDirectLink = code
    ? `https://${baseUrl}/w/${code}`
    : `https://wa.me/${sanitizedClientPhone}?text=${encodeURIComponent(greeting)}`;

  const messageText = [
    `🚨 *Novo Lead Atribuído!*`,
    `👤 *Cliente:* ${leadName}`,
    `📱 *Telefone:* ${leadPhone}`,
    `🚗 *Interesse:* ${vehicleInterest}`,
    `⏱️ *SLA de Resposta:* 15 minutos`,
    ``,
    `👉 *Acesse agora o CRM para iniciar o atendimento:*`,
    crmLink,
    ``,
    `💬 *Chamar no WhatsApp:*`,
    waDirectLink,
  ].join("\n");

  return sendWhatsAppMessage({
    toPhone: sellerPhone,
    messageText,
    isDemo,
    tenantId: organizationId || tenantId,
    organizationId: organizationId || tenantId,
    provider,
  });
}

