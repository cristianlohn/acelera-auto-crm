/**
 * @file route.ts
 * @description Endpoint Oficial de Webhooks do Asaas (POST /api/webhooks/asaas).
 *
 * Funcionalidades:
 * - Validação de segurança criptográfica de token (`asaas-access-token`).
 * - Processamento de eventos de cobrança (`PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`, `SUBSCRIPTION_CREATED`, etc.).
 * - Atualização relacional no Supabase via Supabase Admin (bypassing RLS).
 * - Idempotência estrita para prevenção de execuções duplicadas.
 * - Respostas padronizadas HTTP (200 OK, 400 Bad Request, 401 Unauthorized).
 */

import { NextRequest, NextResponse } from "next/server";
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
    // 1. Obtenção e Validação de Segurança do Token Asaas
    const receivedToken = extractAsaasToken(request);
    const secretToken =
      process.env.ASAAS_WEBHOOK_SECRET ||
      process.env.ASAAS_WEBHOOK_ACCESS_TOKEN ||
      process.env.ASAAS_API_KEY ||
      "asaas_webhook_secret_live";

    if (!verifyAsaasWebhookToken(receivedToken)) {
      console.warn(
        `[Webhook Asaas] Token inválido ou ausente: recebido '${receivedToken || ""}', esperado '${secretToken}'`
      );
      return NextResponse.json(
        {
          error: "Unauthorized",
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
      console.warn("[Webhook Asaas] Payload JSON inválido ou malformatado");
      return NextResponse.json(
        {
          error: "Bad Request: Invalid JSON payload",
          received: false,
        },
        { status: 400 }
      );
    }

    if (!body || !body.event) {
      console.warn("[Webhook Asaas] Payload recebido sem a propriedade 'event'");
      return NextResponse.json(
        {
          error: "Bad Request: Missing 'event' in webhook payload",
          received: false,
        },
        { status: 400 }
      );
    }

    // 3. Log de Diagnóstico Amigável
    console.log(`[Webhook Asaas] Evento recebido: ${body.event}`, {
      id: body.id,
      dateCreated: body.dateCreated,
      paymentId: body.payment?.id,
      subscriptionId: body.subscription?.id,
      customer: body.payment?.customer || body.subscription?.customer,
    });

    // 4. Processamento Idempotente do Evento de Faturamento
    const result = await processAsaasWebhookEvent(body);

    console.log(
      `[Webhook Asaas] Processamento concluído para '${body.event}': ação '${result.actionTaken}' (idempotente: ${result.alreadyProcessed || false})`
    );

    // 5. Retorno HTTP 200 OK com confirmação de recebimento para o Asaas
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
    console.error("[Webhook Asaas Error] Falha interna no processamento:", error);
    // Retorna 200 com flag de erro para evitar loops infinitos de retentativas do gateway
    return NextResponse.json(
      {
        received: true,
        error: "Internal error processing webhook event",
      },
      { status: 200 }
    );
  }
}
