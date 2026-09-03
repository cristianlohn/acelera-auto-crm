/**
 * @file route.ts
 * @description Endpoint de Ingestão Externa de Leads via Webhook (POST /api/webhooks/leads).
 *
 * Funcionalidades:
 * - Autenticação por Header via `x-api-key` ou `Authorization: Bearer <token>`.
 * - Validação e normalização de payloads de portais (Webmotors, iCarros, Meta Ads, Site).
 * - Persistência relacional no Supabase na tabela `leads` com status inicial 'NOVO' e SLA ativo.
 * - Respostas HTTP padronizadas (201 Created, 400 Bad Request, 401 Unauthorized, 500 Internal Error).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import type { LeadOrigin, LeadStatus } from "@/types/database.types";
import { validateApiKey } from "@/lib/services/api-key-service";
import {
  resolveAssignedSeller,
  resetRoundRobinCursor,
  notifyAssignedSellerViaWhatsApp,
  DEFAULT_DEMO_ORG_ID,
} from "@/lib/crm/roleta";
import { generateShortCode } from "@/lib/utils/nanoid";

export { resolveAssignedSeller, resetRoundRobinCursor };

/**
 * Extrai a chave de API dos headers da requisição.
 */
function extractApiKey(request: NextRequest): string | null {
  const xApiKey = request.headers.get("x-api-key");
  if (xApiKey && xApiKey.trim()) {
    return xApiKey.trim();
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
 * Normaliza o canal de origem do lead (Webmotors, iCarros, Meta Ads, Site, etc).
 */
export function normalizeOrigin(rawOrigin?: string): LeadOrigin {
  if (!rawOrigin) return "site";

  const clean = rawOrigin.toLowerCase().trim();

  if (clean === "webmotors" || clean.includes("webmotors")) return "webmotors";
  if (clean === "icarros" || clean.includes("icarros")) return "icarros";
  if (clean === "instagram" || clean.includes("insta")) return "instagram";
  if (clean === "facebook" || clean.includes("face") || clean.includes("meta")) return "instagram";
  if (clean === "whatsapp" || clean.includes("whats")) return "whatsapp";
  if (clean === "olx" || clean.includes("olx")) return "olx";
  if (clean.includes("dono") || clean === "indicacao_dono") return "indicacao_dono";
  if (clean.includes("carteira") || clean === "cliente_carteira") return "cliente_carteira";
  if (clean.includes("patio") || clean.includes("balcao") || clean === "patio_balcao") return "patio_balcao";
  if (clean === "indicacao" || clean.includes("indica")) return "indicacao";
  if (clean === "telefone" || clean.includes("fone")) return "telefone";

  return "site";
}

/**
 * Handler POST para recebimento de webhooks externos de leads.
 */
export async function POST(request: NextRequest) {
  try {
    // -------------------------------------------------------------------------
    // 1. Validação Criptográfica de Autenticação via Header (x-api-key ou Bearer)
    // -------------------------------------------------------------------------
    const apiKey = extractApiKey(request);
    const keyValidation = await validateApiKey(apiKey);

    if (!keyValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Chave de API inválida ou ausente.",
          detail: keyValidation.error,
        },
        { status: 401 }
      );
    }

    const organizationId = keyValidation.organizationId || DEFAULT_DEMO_ORG_ID;

    // -------------------------------------------------------------------------
    // 2. Leitura e Validação do Payload JSON
    // -------------------------------------------------------------------------
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Erro interno ao processar o webhook." },
        { status: 500 }
      );
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Campos 'name' e 'phone' são obrigatórios." },
        { status: 400 }
      );
    }

    const email = typeof body.email === "string" && body.email.trim() ? body.email.trim() : null;
    const vehicleInterest =
      (typeof body.vehicle_interest === "string" && body.vehicle_interest.trim()) ||
      (typeof body.vehicleInterest === "string" && body.vehicleInterest.trim()) ||
      (typeof body.vehicle === "string" && body.vehicle.trim()) ||
      "Interesse Geral";

    const notes =
      (typeof body.notes === "string" && body.notes.trim()) ||
      (typeof body.message === "string" && body.message.trim()) ||
      null;

    const rawSource =
      (typeof body.source === "string" && body.source.trim()) ||
      (typeof body.origin === "string" && body.origin.trim()) ||
      "site";

    const sanitizeSeller = (val?: unknown): string | null => {
      if (typeof val !== "string") return null;
      const trimmed = val.trim();
      if (!trimmed) return null;
      const lower = trimmed.toLowerCase();
      if (lower === "string" || lower === "null" || lower === "undefined" || lower === "none") return null;
      return trimmed;
    };

    const explicitSeller =
      sanitizeSeller(body.seller_id) ||
      sanitizeSeller(body.sellerId) ||
      sanitizeSeller(body.seller_name) ||
      sanitizeSeller(body.sellerName) ||
      sanitizeSeller(body.assigned_to) ||
      null;

    const assignedSeller = await resolveAssignedSeller(explicitSeller, organizationId);
    const normalizedSource = normalizeOrigin(rawSource);
    const initialStatus: LeadStatus = "novo";
    const nowIso = new Date().toISOString();
    const shortCode = generateShortCode(6);
    let leadId = `lead_wh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // -------------------------------------------------------------------------
    // 3. Persistência Relacional no Supabase com Tenant Isolado
    // -------------------------------------------------------------------------
    if (isSupabaseServerConfigured()) {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("leads")
        .insert({
          organization_id: organizationId,
          name,
          phone,
          email,
          vehicle_interest: vehicleInterest,
          status: initialStatus,
          origin: normalizedSource,
          seller_name: assignedSeller,
          last_contact_at: nowIso,
          notes,
          short_code: shortCode,
          created_at: nowIso,
        })
        .select("id")
        .single();

      if (error) {
        console.error("[Webhook Leads Supabase Error]", error.message);
        return NextResponse.json(
          { error: "Erro interno ao processar o webhook." },
          { status: 500 }
        );
      }

      if (data?.id) {
        leadId = data.id;
      }
    }

    // -------------------------------------------------------------------------
    // 3.5. Disparo de Notificação Não-Bloqueante via WhatsApp para o Vendedor
    // -------------------------------------------------------------------------
    void notifyAssignedSellerViaWhatsApp({
      lead: {
        id: leadId,
        name,
        phone,
        email,
        vehicleInterest,
        source: normalizedSource,
        short_code: shortCode,
      },
      sellerName: assignedSeller,
      organizationId: organizationId,
    });

    // -------------------------------------------------------------------------
    // 4. Resposta 201 Created com Confirmação e Vendedor Atribuído
    // -------------------------------------------------------------------------
    return NextResponse.json(
      {
        success: true,
        lead_id: leadId,
        status: initialStatus,
        sla_minutes: 15,
        assigned_seller: assignedSeller,
        distribution_mode: explicitSeller ? "explicit" : "round_robin",
        message: "Lead recebido e atribuído via Roleta Automática com sucesso.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Webhook Leads Fatal Error]", error);
    return NextResponse.json(
      { error: "Erro interno ao processar o webhook." },
      { status: 500 }
    );
  }
}
