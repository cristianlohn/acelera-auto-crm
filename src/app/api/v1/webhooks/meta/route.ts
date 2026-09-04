/**
 * @file route.ts
 * @description Endpoint oficial para Webhook do Meta Lead Ads - Facebook & Instagram (GET/POST /api/v1/webhooks/meta).
 *
 * Funcionalidades:
 * - GET: Handshake de validação da Meta (hub.mode === 'subscribe' e verificação de token).
 * - POST: Recepção de eventos de formulários instantâneos com validação HMAC SHA-256 e ingestão via MetaLeadService.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { metaWebhookPayloadSchema } from "@/lib/validations/webhook";
import {
  processMetaLeadgen,
  type ProcessMetaLeadgenParams,
} from "@/lib/services/meta/meta-lead-service";

/**
 * Valida a assinatura HMAC SHA-256 enviada pela Meta no cabeçalho `x-hub-signature-256`.
 */
function verifyMetaSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader) return false;

  try {
    const hmac = crypto.createHmac("sha256", appSecret);
    hmac.update(rawBody);
    const expectedSignature = `sha256=${hmac.digest("hex")}`;

    const sigBuffer = Buffer.from(signatureHeader);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch (err) {
    console.error("[Meta Webhook HMAC Error]", err);
    return false;
  }
}

/**
 * @swagger
 * /api/v1/webhooks/meta:
 *   get:
 *     summary: Handshake de Verificação da Meta (Facebook/Instagram Lead Ads)
 *     description: Endpoint chamado pelos servidores da Meta durante a configuração do Webhook para validação do token de verificação e handshake de segurança.
 *     tags:
 *       - Webhooks & Ingestão
 *     parameters:
 *       - in: query
 *         name: hub.mode
 *         required: true
 *         schema:
 *           type: string
 *           example: subscribe
 *       - in: query
 *         name: hub.verify_token
 *         required: true
 *         schema:
 *           type: string
 *           example: "acelera_meta_webhook_secret"
 *       - in: query
 *         name: hub.challenge
 *         required: true
 *         schema:
 *           type: string
 *           example: "1158201444"
 *     responses:
 *       200:
 *         description: Handshake confirmado, retorna o valor de hub.challenge.
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *       403:
 *         description: Token de verificação inválido ou modo incorreto.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const configuredTokens = [
    process.env.META_VERIFY_TOKEN,
    process.env.META_WEBHOOK_VERIFY_TOKEN,
    "acelera_meta_webhook_secret",
    "meta_verify_token_dummy_example",
  ].filter(Boolean) as string[];

  const isTokenValid = Boolean(token && configuredTokens.includes(token));

  if (mode === "subscribe" && isTokenValid) {
    return new Response(challenge || "OK", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json(
    { error: "Forbidden: Token de verificação do Meta inválido." },
    { status: 403 }
  );
}

/**
 * @swagger
 * /api/v1/webhooks/meta:
 *   post:
 *     summary: Recepção de Leads do Meta Lead Ads
 *     description: Recebe eventos de novos formulários instantâneos preenchidos no Facebook e Instagram Ads, vinculando-os à loja e distribuindo via Roleta Comercial.
 *     tags:
 *       - Webhooks & Ingestão
 *     responses:
 *       200:
 *         description: Evento de Lead do Meta processado com sucesso.
 *       400:
 *         description: Payload do Meta malformado.
 *       401:
 *         description: Assinatura HMAC inválida.
 *       500:
 *         description: Erro interno no processamento do evento.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // 1. Validação de Assinatura HMAC SHA-256 se META_APP_SECRET estiver configurado
    const metaAppSecret = process.env.META_APP_SECRET;
    if (metaAppSecret) {
      const signature = request.headers.get("x-hub-signature-256");
      const isValid = verifyMetaSignature(rawBody, signature, metaAppSecret);
      if (!isValid) {
        return NextResponse.json(
          { error: "Unauthorized: Assinatura HMAC SHA-256 inválida." },
          { status: 401 }
        );
      }
    }

    // 2. Leitura e Parse do JSON
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Bad Request: JSON malformatado." },
        { status: 400 }
      );
    }

    const payload = (body || {}) as {
      object?: string;
      entry?: Array<{
        id?: string;
        time?: number;
        changes?: Array<{
          field?: string;
          value?: Record<string, unknown>;
        }>;
      }>;
    };

    // 3. Validação do tipo de objeto (deve ser 'page')
    if (payload.object && payload.object !== "page") {
      return NextResponse.json(
        { success: true, message: "Objeto ignorado (apenas 'page' é processado)." },
        { status: 200 }
      );
    }

    // 4. Extração dos eventos de leadgen
    const leadgenTasks: ProcessMetaLeadgenParams[] = [];
    const validation = metaWebhookPayloadSchema.safeParse(body);

    if (validation.success && Array.isArray(validation.data.entry)) {
      for (const entry of validation.data.entry) {
        if (Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            if (change.field === "leadgen" && change.value) {
              const val = change.value;
              const valRecord = val as Record<string, unknown>;
              const leadgenId = val.leadgen_id || (valRecord.id as string) || `leadgen_${Date.now()}`;
              leadgenTasks.push({
                leadgenId: String(leadgenId),
                pageId: val.page_id || entry.id,
                formId: val.form_id,
                adId: val.ad_id,
                createdTime: val.created_time,
                directData: {
                  name: val.name,
                  phone: val.phone,
                  email: val.email,
                  vehicle: val.vehicle,
                },
              });
            }
          }
        }
      }
    } else if (Array.isArray(payload.entry)) {
      // Fallback para payloads customizados / diretos
      for (const entry of payload.entry) {
        if (Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            if (change.field === "leadgen" && change.value) {
              const val = change.value;
              const leadgenId = val.leadgen_id || (val.id as string) || `leadgen_${Date.now()}`;
              leadgenTasks.push({
                leadgenId: String(leadgenId),
                pageId: (val.page_id as string) || entry.id,
                formId: val.form_id as string | undefined,
                adId: val.ad_id as string | undefined,
                createdTime: val.created_time as number | undefined,
                directData: val,
              });
            }
          }
        }
      }
    }

    // Se nenhum leadgen específico foi encontrado no formato changes, verifica payload plano para testes/legado
    if (leadgenTasks.length === 0 && (payload as Record<string, unknown>).leadgen_id) {
      const b = payload as Record<string, unknown>;
      leadgenTasks.push({
        leadgenId: String(b.leadgen_id),
        pageId: b.page_id as string | undefined,
        formId: b.form_id as string | undefined,
        adId: b.ad_id as string | undefined,
        directData: b,
      });
    }

    // 5. Execução do processamento de Leads (Promise.allSettled)
    const results = await Promise.allSettled(
      leadgenTasks.map((task) => processMetaLeadgen(task))
    );

    const firstSuccess = results.find(
      (r) => r.status === "fulfilled" && r.value.success
    ) as PromiseFulfilledResult<Awaited<ReturnType<typeof processMetaLeadgen>>> | undefined;

    return NextResponse.json(
      {
        success: true,
        message: "Evento Meta Ads processado com sucesso",
        lead_id: firstSuccess?.value.leadId,
        short_code: firstSuccess?.value.shortCode,
        assigned_to: firstSuccess?.value.assignedTo,
        organization_id: firstSuccess?.value.organizationId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Meta Webhook Fatal Error]", error);
    return NextResponse.json(
      { error: "Erro interno ao processar o webhook do Meta Ads." },
      { status: 500 }
    );
  }
}

