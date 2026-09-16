/**
 * @file route.ts
 * @description Endpoint Principal e Oficial de Produção para Webhooks do Asaas (POST /api/webhooks/asaas).
 *
 * Configurado no painel do gateway Asaas para recepção de eventos de cobranças,
 * assinaturas e emissão de Notas Fiscais de Serviço (NFS-e).
 *
 * Características:
 * - Validação estrita do header 'asaas-access-token' contra process.env.ASAAS_WEBHOOK_TOKEN (401 se ausente/inválido).
 * - Idempotência com cache deduplicador para evitar processamentos concorrentes ou duplicados.
 * - Suporte completo a PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE, INVOICE_SYNCHRONIZED e INVOICE_FAILED.
 * - Operações de banco executadas via Supabase Admin (Service Role Key) para contornar RLS em webhooks.
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  verifyAsaasWebhookToken,
  processAsaasWebhookEvent,
  type AsaasWebhookPayload,
} from "@/lib/services/asaas/webhook-service";

/**
 * Extrai o token de segurança do Asaas dos headers da requisição.
 */
function extractAsaasToken(request: NextRequest): string | null {
  const asaasHeader =
    request.headers.get("asaas-access-token") ||
    request.headers.get("x-asaas-access-token") ||
    request.headers.get("asaas_access_token");

  if (asaasHeader && asaasHeader.trim()) {
    return asaasHeader.trim();
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer" && parts[1].trim()) {
      return parts[1].trim();
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Extração e Validação Criptográfica do Token do Webhook
    const receivedToken = extractAsaasToken(request);

    if (!receivedToken || !verifyAsaasWebhookToken(receivedToken)) {
      console.warn("[Webhook Asaas] Acesso negado: token asaas-access-token ausente ou inválido.");
      return NextResponse.json(
        {
          error: "Unauthorized: Token de autenticação do webhook inválido.",
          received: false,
        },
        { status: 401 }
      );
    }

    // 2. Extração e Parse do Payload JSON
    let body: AsaasWebhookPayload;
    try {
      body = await request.json();
    } catch {
      console.warn("[Webhook Asaas] Payload JSON malformado");
      return NextResponse.json(
        {
          error: "Bad Request: Invalid JSON payload",
          received: false,
        },
        { status: 400 }
      );
    }

    if (!body || !body.event) {
      console.warn("[Webhook Asaas] Propriedade 'event' ausente no payload");
      return NextResponse.json(
        {
          error: "Bad Request: Missing 'event' in webhook payload",
          received: false,
        },
        { status: 400 }
      );
    }

    // 3. Diagnóstico e Registro
    console.log(`[Webhook Asaas] Recebido evento: ${body.event}`, {
      id: body.id,
      paymentId: body.payment?.id,
      subscriptionId: body.subscription?.id,
      invoiceId: body.invoice?.id,
      customer: body.payment?.customer || body.subscription?.customer || body.invoice?.customer,
    });

    // 4. Processamento Seguro com Idempotência e Admin Client
    const result = await processAsaasWebhookEvent(body);

    console.log(
      `[Webhook Asaas] Concluído para '${body.event}': ação '${result.actionTaken}' (idempotente: ${result.alreadyProcessed || false})`
    );

    // 4.1 Tratamento para eventos descartados com status HTTP 200 para o gateway
    if (result.ignored) {
      return NextResponse.json(
        {
          received: true,
          ignored: true,
          reason: result.reason,
          actionTaken: result.actionTaken,
        },
        { status: 200 }
      );
    }

    if (result.success) {
      try {
        revalidatePath("/", "layout");
      } catch {
        // Silencioso em ambiente de teste
      }
    }

    // 5. Retorno HTTP 200 OK de Confirmação para o Asaas
    return NextResponse.json(
      {
        received: true,
        event: result.event,
        actionTaken: result.actionTaken,
        alreadyProcessed: result.alreadyProcessed || false,
        organizationId: result.organizationId || null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Webhook Asaas Error] Falha interna não tratada no processamento:", error);
    return NextResponse.json(
      {
        received: true,
        error: "Internal error processing webhook event",
      },
      { status: 200 }
    );
  }
}
