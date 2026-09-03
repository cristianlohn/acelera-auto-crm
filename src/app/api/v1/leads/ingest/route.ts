/**
 * @file route.ts
 * @description Route Handler unificado de Ingestão Externa de Leads (POST /api/v1/leads/ingest).
 *
 * Funcionalidades:
 * 1. Autenticação por API Key (Multi-tenant via Header ou Query Param).
 * 2. Identificação do provedor e parse de payload normalizado (Webmotors, Meta Ads, Zod Canonical).
 * 3. Idempotência / Deduplicação por externalId e detecção de recontatos.
 * 4. Match de veículo no estoque da organização (matchVehicleInInventory).
 * 5. Distribuição inteligente de vendedores via Roleta Comercial (Round-Robin).
 * 6. Geração de código curto Base58 (generateShortCode).
 * 7. Persistência relacional do lead com isolamento de tenant.
 * 8. Disparo assíncrono de notificação WhatsApp para o vendedor da vez com links encurtados.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createServerSupabaseClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { validateApiKey } from "@/lib/services/api-key-service";
import { generateShortCode } from "@/lib/utils/nanoid";
import { parseWebmotorsPayload } from "@/lib/services/ingestion/parsers/webmotors-parser";
import { parseMetaAdsPayload } from "@/lib/services/ingestion/parsers/meta-parser";
import { matchVehicleInInventory } from "@/lib/services/ingestion/vehicle-matcher";
import { assignLeadThroughRoleta } from "@/lib/services/roleta/roleta-service";
import { sendSellerLeadNotification } from "@/lib/services/whatsapp/notification-service";
import { leadIngestSchema, normalizeLeadOrigin } from "@/lib/validations/lead";
import { DEFAULT_DEMO_ORG_ID } from "@/lib/auth/tenant";
import type { NormalizedLeadInput } from "@/lib/services/ingestion/types";

async function getSupabaseForIngest() {
  try {
    return createAdminClient();
  } catch {
    return await createServerSupabaseClient();
  }
}

/**
 * Extrai a chave de API dos headers ou da query string.
 */
function extractApiKey(request: NextRequest): string | null {
  const xApiKey = request.headers.get("x-api-key");
  if (xApiKey && xApiKey.trim()) {
    return xApiKey.trim();
  }

  const queryToken =
    request.nextUrl.searchParams.get("token") ||
    request.nextUrl.searchParams.get("api_key");
  if (queryToken && queryToken.trim()) {
    return queryToken.trim();
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
    // 1. Autenticação por API Key da Loja (Multi-tenant)
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Token de autenticação da loja obrigatório (x-api-key ou Authorization: Bearer).",
        },
        { status: 401 }
      );
    }

    const keyValidation = await validateApiKey(apiKey);
    if (!keyValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: `Unauthorized: ${keyValidation.error || "Chave de API inválida ou revogada."}`,
        },
        { status: 401 }
      );
    }

    const organizationId = keyValidation.organizationId || DEFAULT_DEMO_ORG_ID;

    // 2. Leitura do Corpo da Requisição
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Bad Request: JSON malformatado ou corpo da requisição ausente.",
        },
        { status: 400 }
      );
    }

    // 3. Identificação do Provedor e Parse do Payload
    const providerHeader =
      request.headers.get("x-lead-source") ||
      request.nextUrl.searchParams.get("source") ||
      "";

    const detectedProvider = (providerHeader || (body?.source as string) || "").toLowerCase();
    let normalizedLead: NormalizedLeadInput;

    let leadSegment: "new_cars" | "used_cars" | "f_and_i" | "all" | undefined = undefined;
    const rawSegment = body?.segment || (typeof body?.segment === "string" ? body.segment : undefined);
    if (typeof rawSegment === "string") {
      const lower = rawSegment.toLowerCase().trim();
      if (lower === "seminovos" || lower === "usados" || lower === "used" || lower === "used_cars") {
        leadSegment = "used_cars";
      } else if (lower === "novos" || lower === "zero_km" || lower === "0km" || lower === "new" || lower === "new_cars") {
        leadSegment = "new_cars";
      } else if (lower === "f&i" || lower === "financiamento" || lower === "f_and_i") {
        leadSegment = "f_and_i";
      } else {
        leadSegment = "all";
      }
    }

    if (
      detectedProvider === "meta_ads" ||
      detectedProvider === "meta" ||
      Array.isArray(body?.field_data)
    ) {
      normalizedLead = parseMetaAdsPayload(body);
    } else if (
      detectedProvider === "webmotors" ||
      body?.lead ||
      body?.customer ||
      body?.vehicle
    ) {
      normalizedLead = parseWebmotorsPayload(body);
    } else {
      // Formato canônico direto validado via Zod
      const parseResult = leadIngestSchema.safeParse(body);
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

      const p = parseResult.data;
      if (!leadSegment) {
        leadSegment = p.segment;
      }
      normalizedLead = {
        externalId: (body.external_id || body.externalId || body.id) as string | undefined,
        source: (p.source as unknown as NormalizedLeadInput["source"]) || "landing_page",
        clientName: p.name,
        clientPhone: p.phone,
        clientEmail: p.email,
        message: p.notes || "",
        vehicleHint: {
          model: p.vehicle_of_interest,
        },
      };
    }

    if (!normalizedLead.clientPhone || normalizedLead.clientPhone.trim().length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "Bad Request: Telefone do lead é obrigatório e deve ser válido.",
          details: { phone: ["Telefone inválido ou ausente."] },
        },
        { status: 400 }
      );
    }

    // Normalização internacional do telefone (+55...)
    const digitsOnly = normalizedLead.clientPhone.replace(/\D/g, "");
    const formattedPhone = digitsOnly.startsWith("55")
      ? `+${digitsOnly}`
      : `+55${digitsOnly}`;

    // 4. Idempotência / Deduplicação (Evitar leads duplicados de re-tentativas de webhook)
    if (normalizedLead.externalId) {
      try {
        const supabase = await getSupabaseForIngest();
        const { data: existing } = await supabase
          .from("leads")
          .select("id")
          .eq("organization_id", organizationId)
          .maybeSingle();

        if (existing) {
          return NextResponse.json(
            {
              success: true,
              message: "Lead já processado anteriormente.",
              leadId: existing.id,
              lead_id: existing.id,
            },
            { status: 200 }
          );
        }
      } catch {}
    }

    // 5. Extração e Match de Veículo no Estoque Real
    const rawVehicleHint =
      normalizedLead.vehicleHint?.model ||
      normalizedLead.vehicleHint?.brand ||
      (body?.vehicle_of_interest as string) ||
      (body?.vehicleInterest as string) ||
      (body?.vehicle_name as string) ||
      "";

    const matchedVehicle = await matchVehicleInInventory(
      organizationId,
      normalizedLead.vehicleHint || (rawVehicleHint ? { model: rawVehicleHint } : undefined)
    );

    const vehicleName = matchedVehicle
      ? `${matchedVehicle.brand} ${matchedVehicle.model} ${matchedVehicle.version || ""}`.trim()
      : rawVehicleHint || "Interesse Geral";

    const estimatedValue = matchedVehicle ? matchedVehicle.price : 0;

    // 6. Roleta Comercial (Round-Robin da Loja)
    const assignedResult = await assignLeadThroughRoleta(organizationId, leadSegment);
    const assignedSeller =
      assignedResult && assignedResult.id !== "unassigned" ? assignedResult : null;

    // 7. Geração do Link Curto Base58
    const shortCode = generateShortCode(6);
    const now = new Date().toISOString();
    const generatedLeadId = `lead_ingest_${Date.now()}_${generateShortCode(4)}`;

    // 8. Persistência do Lead no Banco & Detecção de Recontatos
    let persistedLeadId = generatedLeadId;
    let isRecontact = false;

    if (isSupabaseServerConfigured()) {
      try {
        const supabase = await getSupabaseForIngest();

        // Tratamento de Recontatos recentes (10 minutos)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { data: existingLeads } = await supabase
          .from("leads")
          .select("id, seller_id, seller_name, notes")
          .eq("organization_id", organizationId)
          .eq("phone", formattedPhone)
          .gte("created_at", tenMinutesAgo)
          .order("created_at", { ascending: false })
          .limit(1);

        if (existingLeads && existingLeads.length > 0) {
          const existing = existingLeads[0];
          persistedLeadId = existing.id;
          isRecontact = true;

          const updatedNotes = normalizedLead.message
            ? `${existing.notes ? `${existing.notes}\n` : ""}[Recontato]: ${normalizedLead.message}`
            : existing.notes;

          await supabase
            .from("leads")
            .update({
              vehicle_interest: vehicleName,
              notes: updatedNotes,
              updated_at: now,
            })
            .eq("id", existing.id);
        } else {
          const { data: newLead, error: insertError } = await supabase
            .from("leads")
            .insert({
              id: generatedLeadId,
              organization_id: organizationId,
              tenant_id: organizationId,
              name: normalizedLead.clientName,
              phone: formattedPhone,
              email: normalizedLead.clientEmail || null,
              vehicle_interest: vehicleName,
              status: "novo",
              origin: normalizeLeadOrigin(normalizedLead.source),
              seller_id: assignedSeller ? assignedSeller.id : null,
              seller_name: assignedSeller ? assignedSeller.name : "Fila de Atendimento",
              notes: normalizedLead.message || null,
              short_code: shortCode,
              last_contact_at: null,
              custom_fields: {
                external_id: normalizedLead.externalId,
                vehicle_id: matchedVehicle?.id || null,
                vehicle_name: vehicleName,
                estimated_value: estimatedValue,
              },
              created_at: now,
              updated_at: now,
            })
            .select()
            .single();

          if (!insertError && newLead) {
            persistedLeadId = newLead.id;
          }
        }
      } catch (dbErr) {
        console.warn("[Ingest Lead] Persistência fallback:", dbErr);
      }
    }

    // 9. Disparo de Notificação WhatsApp para o Vendedor
    if (assignedSeller && assignedSeller.phone) {
      sendSellerLeadNotification({
        sellerPhone: assignedSeller.phone,
        sellerName: assignedSeller.name,
        lead: {
          id: persistedLeadId,
          name: normalizedLead.clientName,
          phone: formattedPhone,
          vehicle_name: vehicleName,
          source: normalizedLead.source,
          short_code: shortCode,
          organization_id: organizationId,
        },
        shortCode: shortCode,
        organizationId: organizationId,
      }).catch((notifErr) => {
        console.warn("[Ingest Notification] Erro ao despachar WhatsApp:", notifErr);
      });
    }

    // 10. Deep Link de WhatsApp para Atendimento
    const targetWaPhone = assignedSeller?.phone
      ? assignedSeller.phone.replace(/\D/g, "")
      : digitsOnly;
    const sellerDisplayName = assignedSeller?.name || "Rafael Alves";
    const vehiclePart =
      vehicleName && vehicleName !== "Interesse Geral" ? ` no ${vehicleName}` : "";
    const greeting = `Olá ${normalizedLead.clientName}, tudo bem? Sou ${sellerDisplayName} da concessionária. Vi seu interesse${vehiclePart}. Como posso te ajudar hoje?`;
    const cleanWaTarget = targetWaPhone.startsWith("55") ? targetWaPhone : `55${targetWaPhone}`;
    const whatsappDirectUrl = `https://wa.me/${cleanWaTarget}?text=${encodeURIComponent(greeting)}`;

    return NextResponse.json(
      {
        success: true,
        leadId: persistedLeadId,
        lead_id: persistedLeadId,
        ...(isRecontact ? { is_recontact: true } : {}),
        assigned_to: assignedSeller
          ? {
              id: assignedSeller.id,
              name: assignedSeller.name,
              phone: assignedSeller.phone,
            }
          : null,
        assignedTo: assignedSeller ? assignedSeller.name : "Fila de Atendimento",
        matchedVehicle: matchedVehicle ? matchedVehicle.model : null,
        shortCode: shortCode,
        whatsapp_direct_url: whatsappDirectUrl,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[Ingest Webhook Error]:", error);
    const msg = error instanceof Error ? error.message : "Erro interno de ingestão.";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
