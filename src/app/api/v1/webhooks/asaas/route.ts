/**
 * @file route.ts
 * @description Endpoint Oficial da API v1 para Webhooks do Asaas (POST /api/v1/webhooks/asaas).
 *
 * Funcionalidades:
 * - Validação de segurança criptográfica em tempo constante de token (`asaas-access-token`).
 * - Processamento de eventos de cobrança (`PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`, etc.).
 * - Atualização administrativa no Supabase via Supabase Admin (bypassing RLS).
 * - Idempotência estrita para prevenção de execuções duplicadas do gateway.
 * - Respostas padronizadas HTTP (200 OK, 400 Bad Request, 401 Unauthorized).
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

/**
 * @swagger
 * /api/v1/webhooks/asaas:
 *   post:
 *     summary: Webhook de Cobranças e Assinaturas Asaas
 *     description: Endpoint de recepção assíncrona de notificações de pagamento e ciclo de vida de assinaturas do gateway Asaas (Pix, Boleto e Cartão de Crédito). Valida o token de segurança no header 'asaas-access-token' e atualiza a organização de forma idempotente.
 *     tags:
 *       - Billing & Assinaturas
 *     parameters:
 *       - in: header
 *         name: asaas-access-token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token de autenticação secreto configurado na conta Asaas.
 *         example: "$aact_YTU5YTE0M2M6N2Nm...exemplo"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event
 *             properties:
 *               id:
 *                 type: string
 *                 example: "evt_001"
 *               event:
 *                 type: string
 *                 description: Tipo do evento disparado pelo gateway Asaas.
 *                 enum:
 *                   - PAYMENT_CONFIRMED
 *                   - PAYMENT_RECEIVED
 *                   - PAYMENT_OVERDUE
 *                   - PAYMENT_DELETED
 *                   - PAYMENT_REFUNDED
 *                   - PAYMENT_RESTORED
 *                 example: "PAYMENT_CONFIRMED"
 *               dateCreated:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-09-01T14:30:00Z"
 *               payment:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: "pay_982139120"
 *                   customer:
 *                     type: string
 *                     example: "cus_00000512412"
 *                   subscription:
 *                     type: string
 *                     example: "sub_10928301"
 *                   value:
 *                     type: number
 *                     example: 297.00
 *                   netValue:
 *                     type: number
 *                     example: 295.01
 *                   billingType:
 *                     type: string
 *                     example: "PIX"
 *                   status:
 *                     type: string
 *                     example: "CONFIRMED"
 *                   dueDate:
 *                     type: string
 *                     format: date
 *                     example: "2026-09-05"
 *                   confirmedDate:
 *                     type: string
 *                     format: date
 *                     example: "2026-09-01"
 *                   externalReference:
 *                     type: string
 *                     example: "a0000000-0000-0000-0000-000000000001"
 *           examples:
 *             PAYMENT_CONFIRMED:
 *               summary: Pagamento Confirmado (Cartão de Crédito ou Pix)
 *               value:
 *                 id: "evt_pay_conf_001"
 *                 event: "PAYMENT_CONFIRMED"
 *                 dateCreated: "2026-09-01T14:30:00Z"
 *                 payment:
 *                   id: "pay_982139120"
 *                   customer: "cus_00000512412"
 *                   subscription: "sub_10928301"
 *                   value: 297.00
 *                   netValue: 295.01
 *                   billingType: "CREDIT_CARD"
 *                   status: "CONFIRMED"
 *                   dueDate: "2026-09-05"
 *                   confirmedDate: "2026-09-01"
 *                   externalReference: "a0000000-0000-0000-0000-000000000001"
 *             PAYMENT_RECEIVED:
 *               summary: Pagamento Recebido / Compensado em Conta
 *               value:
 *                 id: "evt_pay_rec_002"
 *                 event: "PAYMENT_RECEIVED"
 *                 dateCreated: "2026-09-01T14:35:00Z"
 *                 payment:
 *                   id: "pay_982139121"
 *                   customer: "cus_00000512412"
 *                   subscription: "sub_10928301"
 *                   value: 297.00
 *                   netValue: 295.01
 *                   billingType: "PIX"
 *                   status: "RECEIVED"
 *                   dueDate: "2026-09-05"
 *                   confirmedDate: "2026-09-01"
 *                   externalReference: "a0000000-0000-0000-0000-000000000001"
 *             PAYMENT_OVERDUE:
 *               summary: Cobrança Vencida / Inadimplência
 *               value:
 *                 id: "evt_pay_ovd_003"
 *                 event: "PAYMENT_OVERDUE"
 *                 dateCreated: "2026-09-06T08:00:00Z"
 *                 payment:
 *                   id: "pay_982139122"
 *                   customer: "cus_00000512412"
 *                   subscription: "sub_10928301"
 *                   value: 297.00
 *                   billingType: "BOLETO"
 *                   status: "OVERDUE"
 *                   dueDate: "2026-09-05"
 *                   externalReference: "a0000000-0000-0000-0000-000000000001"
 *             PAYMENT_DELETED:
 *               summary: Cobrança Removida ou Cancelada
 *               value:
 *                 id: "evt_pay_del_004"
 *                 event: "PAYMENT_DELETED"
 *                 dateCreated: "2026-09-01T15:00:00Z"
 *                 payment:
 *                   id: "pay_982139123"
 *                   customer: "cus_00000512412"
 *                   subscription: "sub_10928301"
 *                   value: 297.00
 *                   status: "DELETED"
 *                   externalReference: "a0000000-0000-0000-0000-000000000001"
 *     responses:
 *       200:
 *         description: Evento do webhook processado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                   example: true
 *                 actionTaken:
 *                   type: string
 *                   example: "ORGANIZATION_ACTIVATED"
 *                 alreadyProcessed:
 *                   type: boolean
 *                   example: false
 *                 organizationId:
 *                   type: string
 *                   example: "a0000000-0000-0000-0000-000000000001"
 *       400:
 *         description: Payload malformado ou ausência do campo 'event'.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Bad Request: Missing 'event' in webhook payload"
 *       401:
 *         description: Token de autenticação asaas-access-token ausente ou inválido.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Unauthorized: Token de autenticação do webhook inválido."
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Obtenção e Validação de Segurança do Token Asaas
    const receivedToken = extractAsaasToken(request);

    if (!verifyAsaasWebhookToken(receivedToken)) {
      console.warn("[Webhook Asaas] Token inválido ou ausente.");
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

    if (result.success) {
      try {
        revalidatePath("/", "layout");
      } catch {
        // Ignora em ambientes de teste sem static generation store
      }
    }

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
    return NextResponse.json(
      {
        received: true,
        error: "Internal error processing webhook event",
      },
      { status: 200 }
    );
  }
}
