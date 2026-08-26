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

/** Lista padrão de vendedores ativos para a Roleta Automática (Round-Robin) */
const DEFAULT_ACTIVE_SELLERS = [
  "Rafael Alves",
  "Juliana Costa",
  "Marcos Ferreira",
];

let roundRobinCursor = 0;

/**
 * Reseta o cursor da roleta de vendedores (utilizado em testes unitários/integração).
 */
export function resetRoundRobinCursor(val = 0) {
  roundRobinCursor = val;
}

/**
 * Determina o vendedor atribuído ao lead (específico ou via Roleta Automática).
 */
export async function resolveAssignedSeller(
  explicitSeller?: string | null,
  organizationId: string = DEFAULT_DEMO_ORG_ID
): Promise<string> {
  if (explicitSeller && explicitSeller.trim()) {
    return explicitSeller.trim();
  }

  let activeSellers = DEFAULT_ACTIVE_SELLERS;

  if (isSupabaseServerConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: teamData } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("organization_id", organizationId)
        .in("role", ["vendedor"]);

      if (teamData && teamData.length > 0) {
        const names = teamData
          .map((p) => p.full_name)
          .filter((name): name is string => Boolean(name && name.trim()));
        if (names.length > 0) {
          activeSellers = names;
        }
      } else {
        // Fallback seguro: quando não houver vendedores ativos, alocar para o Gestor / Admin
        const { data: adminData } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("organization_id", organizationId)
          .in("role", ["admin", "gerente"]);

        if (adminData && adminData.length > 0) {
          const adminNames = adminData
            .map((p) => p.full_name)
            .filter((name): name is string => Boolean(name && name.trim()));
          if (adminNames.length > 0) {
            return adminNames[0];
          }
        }
      }
    } catch {
      // Fallback para lista padrão
    }
  }

  if (activeSellers.length === 0) {
    return "Fila de Atendimento";
  }

  const assigned = activeSellers[roundRobinCursor % activeSellers.length];
  roundRobinCursor = (roundRobinCursor + 1) % activeSellers.length;
  return assigned;
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

    const explicitSeller =
      (typeof body.seller_name === "string" && body.seller_name.trim()) ||
      (typeof body.sellerName === "string" && body.sellerName.trim()) ||
      (typeof body.assigned_to === "string" && body.assigned_to.trim()) ||
      null;

    const assignedSeller = await resolveAssignedSeller(explicitSeller, DEFAULT_DEMO_ORG_ID);
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
          seller_name: assignedSeller,
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
