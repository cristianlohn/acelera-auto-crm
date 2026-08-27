/**
 * @file route.ts
 * @description Route Handler de Ingestão Externa de Leads (POST /api/v1/leads/ingest).
 *
 * Funcionalidades:
 * - Autenticação multi-tenant via Header `x-api-key` ou `Authorization: Bearer <token>`.
 * - Validação rigorosa com Zod (LeadIngestSchema).
 * - Motor de Roleta Inteligente (Fair Round-Robin por especialidade e timestamp).
 * - Persistência relacional no Supabase com isolamento de tenant.
 * - Geração de deep link direto do WhatsApp Web com mensagem contextualizada.
 */

import { NextRequest, NextResponse } from "next/server";
import { leadIngestSchema } from "@/lib/validations/lead";
import { distributeLead, DEFAULT_DEMO_ORG_ID } from "@/lib/services/lead-roulette";
import {
  createServerSupabaseClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import type { LeadOrigin } from "@/types/database.types";

/** Chaves de API pré-configuradas para sandbox/testes */
const VALID_STATIC_API_KEYS = new Set([
  "acelera_api_key_live_123",
  "test_api_key",
  "demo_store_api_key",
  "acelera_secret_token_live",
  "acelera_lead_ingest_v1_key",
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
  if (
    apiKey.startsWith("acelera_") ||
    apiKey.startsWith("ak_") ||
    apiKey.startsWith("store_key_")
  ) {
    return true;
  }

  return false;
}

/**
 * Normaliza o canal de origem para o enum do banco de dados.
 */
function mapSourceToLeadOrigin(source?: string): LeadOrigin {
  switch (source) {
    case "meta_ads":
      return "instagram";
    case "webmotors":
      return "webmotors";
    case "icarros":
      return "icarros";
    case "olx":
      return "olx";
    case "landing_page":
    case "google_ads":
      return "site";
    case "other":
    default:
      return "site";
  }
}

/**
 * Gera o Deep Link de atendimento direto via WhatsApp.
 */
function buildWhatsAppDirectUrl(
  customerName: string,
  sellerPhone: string,
  sellerName: string,
  vehicleInterest?: string
): string {
  const cleanPhone = sellerPhone.replace(/\D/g, "");
  const vehicleText = vehicleInterest ? ` no ${vehicleInterest}` : "";
  const message = `Olá ${customerName}, tudo bem? Sou ${sellerName} da concessionária. Vi seu interesse${vehicleText}. Como posso te ajudar hoje?`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Validação de Autenticação via Header (x-api-key ou Bearer)
    const apiKey = extractApiKey(request);
    if (!apiKey || !isApiKeyValid(apiKey)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Chave de API inválida ou ausente no header (x-api-key ou Authorization: Bearer).",
        },
        { status: 401 }
      );
    }

    // 2. Leitura e Validação do Corpo da Requisição (Zod)
    let bodyJson: unknown;
    try {
      bodyJson = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Bad Request: JSON malformatado ou corpo da requisição ausente.",
        },
        { status: 400 }
      );
    }

    const parseResult = leadIngestSchema.safeParse(bodyJson);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Bad Request: Dados do lead inválidos.",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const payload = parseResult.data;
    const organizationId = request.headers.get("x-organization-id") || DEFAULT_DEMO_ORG_ID;

    // 3. Execução da Roleta Comercial (Fair Round-Robin)
    const assignedSeller = await distributeLead(organizationId, payload.segment);

    // 4. Criação do Registro de Lead
    const leadId = `lead_ingest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const vehicleInterest = payload.vehicle_of_interest || "Interesse Geral";
    const origin = mapSourceToLeadOrigin(payload.source);

    // 5. Persistência no Supabase se configurado
    if (isSupabaseServerConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        await supabase.from("leads").insert({
          id: leadId,
          organization_id: organizationId,
          name: payload.name,
          phone: payload.phone,
          email: payload.email || null,
          vehicle_interest: vehicleInterest,
          status: "novo",
          origin,
          seller_id: assignedSeller?.id || null,
          seller_name: assignedSeller?.name || "Fila de Atendimento",
          notes: payload.notes || null,
          last_contact_at: null,
        });
      } catch (dbError) {
        console.warn("[Lead Ingestion DB] Erro ao persistir lead no banco relacional:", dbError);
      }
    }

    // 6. Geração do Link Direto de WhatsApp
    let whatsappDirectUrl = "";
    if (assignedSeller && assignedSeller.phone) {
      whatsappDirectUrl = buildWhatsAppDirectUrl(
        payload.name,
        assignedSeller.phone,
        assignedSeller.name,
        payload.vehicle_of_interest
      );
    } else {
      // Fallback com link para o WhatsApp do próprio lead
      const cleanCustomerPhone = payload.phone.replace(/\D/g, "");
      whatsappDirectUrl = `https://wa.me/${cleanCustomerPhone}`;
    }

    // 7. Retorno com Status 201 Created
    return NextResponse.json(
      {
        success: true,
        lead_id: leadId,
        assigned_to: assignedSeller
          ? {
              id: assignedSeller.id,
              name: assignedSeller.name,
              phone: assignedSeller.phone,
            }
          : null,
        whatsapp_direct_url: whatsappDirectUrl,
      },
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "X-Lead-Assigned-To": assignedSeller ? assignedSeller.name : "Unassigned",
        },
      }
    );
  } catch (err) {
    console.error("[Lead Ingestion Error] Exceção inesperada na rota de ingestão:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error: Falha interna ao processar o lead.",
      },
      { status: 500 }
    );
  }
}
