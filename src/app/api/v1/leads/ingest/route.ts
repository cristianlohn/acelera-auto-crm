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
import { leadIngestSchema, normalizeLeadOrigin } from "@/lib/validations/lead";
import { distributeLead, DEFAULT_DEMO_ORG_ID } from "@/lib/services/lead-roulette";
import { validateApiKey } from "@/lib/services/api-key-service";
import {
  createServerSupabaseClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getSupabaseForIngest() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      return createAdminClient();
    } catch {}
  }
  return await createServerSupabaseClient();
}

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
    // 1. Validação Criptográfica de Autenticação via SHA-256 e Status de Revogação
    const apiKey = extractApiKey(request);
    const keyValidation = await validateApiKey(apiKey);

    if (!keyValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: `Unauthorized: ${keyValidation.error || "Chave de API inválida ou ausente no header (x-api-key ou Authorization: Bearer)."}`,
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
    const organizationId =
      keyValidation.organizationId ||
      request.headers.get("x-organization-id") ||
      DEFAULT_DEMO_ORG_ID;

    // 3. Execução da Roleta Comercial (Fair Round-Robin)
    const assignedSeller = await distributeLead(organizationId, payload.segment);

    // 4. Criação do Registro de Lead ou Detecção de Recontato / Idempotência
    let leadId = `lead_ingest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let isRecontact = false;
    const vehicleInterest = payload.vehicle_of_interest || "Interesse Geral";
    const origin = normalizeLeadOrigin(payload.source);
    const nowIso = new Date().toISOString();

    // 5. Persistência e Idempotência no Supabase com getSupabaseForIngest
    if (isSupabaseServerConfigured()) {
      try {
        const adminSupabase = await getSupabaseForIngest();

        // Verifica se existe lead recente com mesmo telefone na mesma organização (últimos 10 minutos)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { data: existingLeads } = await adminSupabase
          .from("leads")
          .select("id, seller_id, seller_name, notes")
          .eq("organization_id", organizationId)
          .eq("phone", payload.phone)
          .gte("created_at", tenMinutesAgo)
          .order("created_at", { ascending: false })
          .limit(1);

        if (existingLeads && existingLeads.length > 0) {
          const existing = existingLeads[0];
          leadId = existing.id;
          isRecontact = true;

          const updatedNotes = payload.notes
            ? `${existing.notes ? `${existing.notes}\n` : ""}[Recontato]: ${payload.notes}`
            : existing.notes;

          await adminSupabase
            .from("leads")
            .update({
              vehicle_interest: vehicleInterest,
              notes: updatedNotes,
              updated_at: nowIso,
            })
            .eq("id", leadId);
        } else {
          const { error: insertError } = await adminSupabase.from("leads").insert({
            id: leadId,
            organization_id: organizationId,
            tenant_id: organizationId,
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
            created_at: nowIso,
            updated_at: nowIso,
          });

          if (insertError) {
            console.warn("[Lead Ingestion Fallback]:", insertError.message);
            await adminSupabase.from("leads").insert({
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
              created_at: nowIso,
              updated_at: nowIso,
            });
          }
        }
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

    // 7. Retorno com Status 201 Created (suportando snake_case e camelCase)
    const assignedPayload = assignedSeller
      ? {
          id: assignedSeller.id,
          name: assignedSeller.name,
          phone: assignedSeller.phone,
        }
      : null;

    return NextResponse.json(
      {
        success: true,
        lead_id: leadId,
        leadId,
        is_recontact: isRecontact,
        assigned_to: assignedPayload,
        assignedTo: assignedPayload,
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
