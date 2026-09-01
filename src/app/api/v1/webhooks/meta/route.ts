/**
 * @file route.ts
 * @description Endpoint para Webhook do Meta Lead Ads - Facebook & Instagram (GET/POST /api/v1/webhooks/meta).
 */

import { NextRequest, NextResponse } from "next/server";
import { metaWebhookPayloadSchema } from "@/lib/validations/webhook";
import {
  resolveAssignedSellerInfo,
  notifyAssignedSellerViaWhatsApp,
  DEFAULT_DEMO_ORG_ID,
} from "@/lib/crm/roleta";
import {
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractApiKeyFromRequest } from "@/lib/auth/validate-api-key";
import { validateApiKey } from "@/lib/services/api-key-service";
import type { LeadStatus } from "@/types/database.types";

const META_DEFAULT_VERIFY_TOKEN =
  process.env.META_WEBHOOK_VERIFY_TOKEN || "meta_verify_token_dummy_example";

/**
 * @swagger
 * /api/v1/webhooks/meta:
 *   get:
 *     summary: Verificação de Webhook do Meta (Facebook/Instagram Lead Ads)
 *     description: Endpoint chamado pelos servidores do Meta durante a configuração do Webhook para validação do token de verificação e handshake de segurança.
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
 *           example: "meta_verify_token_dummy_example"
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
 *   post:
 *     summary: Recepção de Leads do Meta Lead Ads
 *     description: Recebe eventos de novos formulários instantâneos preenchidos no Facebook e Instagram Ads, vinculando-os à loja e distribuindo via Roleta Comercial.
 *     tags:
 *       - Webhooks & Ingestão
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               object:
 *                 type: string
 *                 example: page
 *               entry:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Evento de Lead do Meta processado com sucesso.
 *       400:
 *         description: Payload do Meta malformado.
 *       500:
 *         description: Erro interno no processamento do evento.
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === META_DEFAULT_VERIFY_TOKEN) {
    return new Response(challenge || "OK", { status: 200 });
  }

  return NextResponse.json(
    { error: "Forbidden: Token de verificação do Meta inválido." },
    { status: 403 }
  );
}

export async function POST(request: NextRequest) {
  try {
    // 1. Identificação do Tenant (via header x-api-key opcional ou default org)
    let organizationId = DEFAULT_DEMO_ORG_ID;
    const apiKey = extractApiKeyFromRequest(request);
    if (apiKey) {
      const validation = await validateApiKey(apiKey);
      if (validation.valid && validation.organizationId) {
        organizationId = validation.organizationId;
      }
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Bad Request: JSON malformatado." },
        { status: 400 }
      );
    }

    const validation = metaWebhookPayloadSchema.safeParse(body);
    let leadName = "Lead Meta Ads";
    let leadPhone = "11999990000";
    let leadEmail: string | null = null;
    let vehicleInterest = "Campanha Meta Ads";
    let notes = "Lead gerado no Meta Lead Ads (Facebook/Instagram)";

    if (validation.success && validation.data.entry.length > 0) {
      const firstEntry = validation.data.entry[0];
      const change = firstEntry.changes?.[0]?.value;

      if (change) {
        if (change.name) leadName = change.name;
        if (change.phone) leadPhone = change.phone;
        if (change.email) leadEmail = change.email;
        if (change.vehicle) vehicleInterest = change.vehicle;
        if (change.form_id) {
          notes = `Meta Form ID: ${change.form_id} | Ad ID: ${change.ad_id || "N/A"}`;
        }
      }
    }

    // 2. Distribuição por Roleta Comercial com fallback
    let sellerInfo = { sellerId: null as string | null, sellerName: "Fila Geral" };
    try {
      const resolved = await resolveAssignedSellerInfo(null, organizationId);
      sellerInfo = {
        sellerId: resolved.sellerId ?? null,
        sellerName: resolved.sellerName,
      };
    } catch (roletaErr) {
      console.warn("[Meta Webhook Roleta Warning]:", roletaErr);
    }

    let leadId = `lead_meta_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    const initialStatus: LeadStatus = "novo";

    // 3. Persistência Relacional Segura no Supabase com createAdminClient
    if (isSupabaseServerConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const adminSupabase = createAdminClient();
        const { data: inserted, error: insertError } = await adminSupabase
          .from("leads")
          .insert({
            organization_id: organizationId,
            tenant_id: organizationId,
            name: leadName,
            phone: leadPhone,
            email: leadEmail,
            vehicle_interest: vehicleInterest,
            status: initialStatus,
            origin: "instagram",
            seller_name: sellerInfo.sellerName,
            seller_id: sellerInfo.sellerId,
            notes,
            last_contact_at: nowIso,
            created_at: nowIso,
          })
          .select("id")
          .maybeSingle();

        if (insertError) {
          console.warn("[Meta Webhook DB Insert Fallback]:", insertError.message);
          const { data: fallbackInserted } = await adminSupabase
            .from("leads")
            .insert({
              organization_id: organizationId,
              name: leadName,
              phone: leadPhone,
              email: leadEmail,
              vehicle_interest: vehicleInterest,
              status: initialStatus,
              origin: "instagram",
              seller_name: sellerInfo.sellerName,
              seller_id: sellerInfo.sellerId,
              notes,
              last_contact_at: nowIso,
              created_at: nowIso,
            })
            .select("id")
            .maybeSingle();

          if (fallbackInserted?.id) {
            leadId = fallbackInserted.id;
          }
        } else if (inserted?.id) {
          leadId = inserted.id;
        }
      } catch (dbErr) {
        console.error("[Meta Webhook DB Error]:", dbErr);
      }
    }

    // 4. Notificação Não-Bloqueante via WhatsApp
    void notifyAssignedSellerViaWhatsApp({
      lead: {
        id: leadId,
        name: leadName,
        phone: leadPhone,
        email: leadEmail,
        vehicleInterest,
        source: "instagram",
      },
      sellerName: sellerInfo.sellerName,
      organizationId,
    });

    return NextResponse.json(
      {
        success: true,
        lead_id: leadId,
        assigned_to: sellerInfo.sellerName,
        message: "Evento Meta Ads processado com sucesso",
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
