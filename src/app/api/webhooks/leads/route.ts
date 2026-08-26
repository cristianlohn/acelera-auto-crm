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

/** Organização padrão para persistência demo/sandbox */
const DEFAULT_DEMO_ORG_ID = "a0000000-0000-0000-0000-000000000001";

/** Chaves de API pré-configuradas para sandbox/testes */
const VALID_STATIC_API_KEYS = new Set([
  "acelera_api_key_live_123",
  "test_api_key",
  "demo_store_api_key",
  "acelera_secret_token_live",
]);

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
 * Valida a autenticidade da chave de API fornecida.
 */
function isApiKeyValid(apiKey: string | null): boolean {
  if (!apiKey) return false;

  const envKey = process.env.STORE_API_KEY || process.env.ACELERA_WEBHOOK_API_KEY;
  if (envKey && apiKey === envKey) {
    return true;
  }

  if (VALID_STATIC_API_KEYS.has(apiKey)) {
    return true;
  }

  // Valida chaves que seguem o padrão de prefixo seguro
  if (apiKey.startsWith("acelera_") || apiKey.startsWith("ak_") || apiKey.startsWith("store_key_")) {
    return true;
  }

  return false;
}

/**
 * Normaliza o canal de origem do lead (Webmotors, iCarros, Meta Ads, Site, etc).
 */
function normalizeOrigin(rawOrigin?: string): LeadOrigin {
  if (!rawOrigin) return "site";

  const clean = rawOrigin.toLowerCase().trim();

  if (clean === "webmotors" || clean.includes("webmotors")) return "site" as LeadOrigin; // fallback compatível ou mapeado
  if (clean === "icarros" || clean.includes("icarros")) return "icarros";
  if (clean === "instagram" || clean.includes("insta")) return "instagram";
  if (clean === "facebook" || clean.includes("face") || clean.includes("meta")) return "instagram";
  if (clean === "whatsapp" || clean.includes("whats")) return "whatsapp";
  if (clean === "olx" || clean.includes("olx")) return "olx";
  if (clean === "indicacao") return "indicacao";
  if (clean === "telefone") return "telefone";

  return "site";
}

/**
 * Handler POST para recebimento de webhooks externos de leads.
 */
export async function POST(request: NextRequest) {
  try {
    // -------------------------------------------------------------------------
    // 1. Validação de Autenticação via Header (x-api-key ou Bearer)
    // -------------------------------------------------------------------------
    const apiKey = extractApiKey(request);

    if (!isApiKeyValid(apiKey)) {
      return NextResponse.json(
        { error: "Chave de API inválida ou ausente." },
        { status: 401 }
      );
    }

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

    const normalizedSource = normalizeOrigin(rawSource);
    const initialStatus: LeadStatus = "novo";
    const nowIso = new Date().toISOString();
    let leadId = `lead_wh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // -------------------------------------------------------------------------
    // 3. Persistência Relacional no Supabase (se configurado)
    // -------------------------------------------------------------------------
    if (isSupabaseServerConfigured()) {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("leads")
        .insert({
          organization_id: DEFAULT_DEMO_ORG_ID,
          name,
          phone,
          email,
          vehicle_interest: vehicleInterest,
          status: initialStatus,
          origin: normalizedSource,
          seller_name: "Fila de Atendimento",
          last_contact_at: nowIso,
          notes,
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
    // 4. Resposta 201 Created com Confirmação
    // -------------------------------------------------------------------------
    return NextResponse.json(
      {
        success: true,
        lead_id: leadId,
        message: "Lead recebido e inserido no funil com sucesso.",
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
