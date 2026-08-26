/**
 * @file client.ts
 * @description Provedor modular defensivo para envio de mensagens via WhatsApp Gateway (Evolution API, Z-API, Meta Cloud API ou Simulação).
 */

export interface SendWhatsAppMessageParams {
  toPhone: string;
  messageText: string;
}

export interface SendWhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

/**
 * Sanitiza o número de telefone para o formato internacional E.164 padrão WhatsApp (ex: 5511999998888).
 */
export function sanitizeWhatsAppPhone(phone: string): string {
  if (!phone) return "";

  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";

  // Telefone fixo/móvel de 10 dígitos (DDD + 8 dígitos) -> adiciona 9 se for celular e prefixa DDI 55
  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const number = digits.slice(2);
    const formattedNumber = number.length === 8 && /^[6-9]/.test(number) ? `9${number}` : number;
    return `55${ddd}${formattedNumber}`;
  }

  // Telefone celular brasileiro de 11 dígitos (DDD + 9 dígitos) -> prefixa DDI 55
  if (digits.length === 11) {
    return `55${digits}`;
  }

  // Se já possui DDI 55 e tem 12 ou 13 dígitos
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  return digits;
}

/**
 * Envia uma mensagem via WhatsApp com timeout controlado (4s) e tratamento tolerante a falhas.
 * Em ambientes sem credenciais configuradas, executa em modo Simulado/Log sem quebrar o fluxo.
 */
export async function sendWhatsAppMessage({
  toPhone,
  messageText,
}: SendWhatsAppMessageParams): Promise<SendWhatsAppMessageResult> {
  const sanitizedPhone = sanitizeWhatsAppPhone(toPhone);

  if (!sanitizedPhone) {
    console.warn("[WhatsApp Service] Número de telefone inválido ou vazio.");
    return {
      success: false,
      error: "Número de telefone inválido.",
    };
  }

  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN;

  // Modo Simulação/Fallback: variáveis de ambiente não configuradas ou modo mock
  if (!apiUrl || !apiToken || apiUrl.includes("placeholder") || apiUrl === "mock") {
    console.log(
      `[WhatsApp Service - Simulação] Mensagem despachada para +${sanitizedPhone} (Gateway não configurado em produção):`
    );
    console.log(`---\n${messageText}\n---`);
    return {
      success: true,
      simulated: true,
      messageId: `mock_msg_${Date.now()}`,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 segundos de timeout máximo

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
        apikey: apiToken,
      },
      body: JSON.stringify({
        number: sanitizedPhone,
        phone: sanitizedPhone,
        message: messageText,
        text: messageText,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Erro desconhecido");
      console.error(
        `[WhatsApp Service Error] Gateway respondeu status ${response.status}: ${errorText}`
      );
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const responseData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const messageId = String(responseData.id || responseData.messageId || `msg_${Date.now()}`);

    console.log(`[WhatsApp Service] Mensagem enviada com sucesso para +${sanitizedPhone} (ID: ${messageId})`);
    return {
      success: true,
      messageId,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[WhatsApp Service Exception] Falha na comunicação com gateway: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
