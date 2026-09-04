/**
 * @file meta-lead-service.ts
 * @description Serviço de Ingestão de Leads do Meta Lead Ads (Facebook & Instagram Ads).
 *
 * Responsabilidades:
 * - Resolução multi-tenant da organização proprietária via `page_id` na tabela `meta_integrations`.
 * - Consulta resiliente à Graph API v20.0 da Meta (`https://graph.facebook.com/v20.0/{leadgen_id}`).
 * - Normalização semântica de formulários instantâneos (`field_data`), extraindo nome, email e interesse de veículo.
 * - Sanitização de telefone brasileiro com prefixo DDI 55 obrigatório.
 * - Atribuição na Roleta Comercial (Round-Robin balanceado) e persistência no Supabase.
 * - Disparo assíncrono de alerta WhatsApp com link encurtado `/w/[short_code]` para o vendedor.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import {
  resolveAssignedSellerInfo,
  notifyAssignedSellerViaWhatsApp,
  DEFAULT_DEMO_ORG_ID,
} from "@/lib/crm/roleta";
import { generateShortCode } from "@/lib/utils/nanoid";
import { matchVehicleInInventory } from "@/lib/services/ingestion/vehicle-matcher";
import type { LeadStatus } from "@/types/database.types";

export interface MetaFieldItem {
  name: string;
  values: string[];
}

export interface MetaLeadgenGraphResponse {
  id: string;
  created_time?: string;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  form_id?: string;
  page_id?: string;
  field_data?: MetaFieldItem[];
  [key: string]: unknown;
}

export interface MetaIntegrationRecord {
  id: string;
  organization_id: string;
  page_id: string;
  page_name: string | null;
  page_access_token: string;
  verify_token: string;
  is_active: boolean;
}

export interface ProcessMetaLeadgenParams {
  leadgenId: string;
  pageId?: string;
  formId?: string;
  adId?: string;
  createdTime?: number;
  /** Permite passar dados diretos quando já extraídos ou para testes */
  directData?: {
    name?: string;
    phone?: string;
    email?: string;
    vehicle?: string;
    notes?: string;
    [key: string]: unknown;
  };
}

export interface ProcessMetaLeadgenResult {
  success: boolean;
  leadId?: string;
  shortCode?: string;
  assignedTo?: string;
  organizationId?: string;
  clientName?: string;
  clientPhone?: string;
  vehicleInterest?: string;
  error?: string;
}

/**
 * Consulta os dados completos de um Leadgen na Graph API da Meta (v20.0).
 */
export async function fetchMetaLeadgenData(
  leadgenId: string,
  pageAccessToken: string
): Promise<MetaLeadgenGraphResponse | null> {
  const url = `https://graph.facebook.com/v20.0/${leadgenId}?access_token=${encodeURIComponent(
    pageAccessToken
  )}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `[Meta Lead Service] Erro na Graph API (${response.status}) ao consultar leadgen "${leadgenId}":`,
        errorBody
      );
      return null;
    }

    const data = (await response.json()) as MetaLeadgenGraphResponse;
    return data;
  } catch (error) {
    console.error(
      `[Meta Lead Service] Falha de rede/requisição na Graph API para leadgen "${leadgenId}":`,
      error
    );
    return null;
  }
}

/**
 * Sanitiza e formata número de telefone brasileiro garantindo DDI 55.
 * Se o telefone tiver 10 ou 11 dígitos e não começar com 55, adiciona o prefixo 55.
 */
export function sanitizeMetaPhone(rawPhone?: string | null): string {
  if (!rawPhone) return "";
  let digits = rawPhone.replace(/\D/g, "");

  // Se tiver 10 ou 11 dígitos e não começar com 55, adiciona DDI 55
  if (digits.length >= 10 && digits.length <= 11 && !digits.startsWith("55")) {
    digits = `55${digits}`;
  }

  return digits;
}

/**
 * Normaliza semântica dos campos `field_data` da Meta.
 */
export function normalizeMetaFieldData(
  fieldData?: MetaFieldItem[],
  fallback?: {
    adName?: string;
    formId?: string;
    adId?: string;
    pageId?: string;
  }
): {
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  vehicleInterest: string;
  notes: string;
} {
  const fieldsMap = new Map<string, string>();

  if (Array.isArray(fieldData)) {
    for (const item of fieldData) {
      if (item.name && Array.isArray(item.values) && item.values.length > 0) {
        const val = item.values[0]?.trim();
        if (val) {
          fieldsMap.set(item.name.toLowerCase().trim(), val);
        }
      }
    }
  }

  // 1. Extração de Nome
  let clientName =
    fieldsMap.get("full_name") ||
    fieldsMap.get("nome_completo") ||
    fieldsMap.get("nome") ||
    "";

  if (!clientName) {
    const firstName = fieldsMap.get("first_name") || "";
    const lastName = fieldsMap.get("last_name") || "";
    const combined = `${firstName} ${lastName}`.trim();
    if (combined) {
      clientName = combined;
    }
  }

  if (!clientName) {
    clientName = fieldsMap.get("name") || "Lead Meta Ads";
  }

  // 2. Extração de Telefone com DDI 55
  const rawPhone =
    fieldsMap.get("phone_number") ||
    fieldsMap.get("phone") ||
    fieldsMap.get("telefone") ||
    fieldsMap.get("whatsapp") ||
    fieldsMap.get("celular") ||
    fieldsMap.get("numero_telefone") ||
    "";

  const clientPhone = sanitizeMetaPhone(rawPhone);

  // 3. Extração de E-mail
  const clientEmail =
    fieldsMap.get("email") ||
    fieldsMap.get("e-mail") ||
    fieldsMap.get("electronic_mail") ||
    null;

  // 4. Extração de Veículo de Interesse
  let vehicleInterest = "";
  for (const [key, val] of fieldsMap.entries()) {
    if (
      key.includes("veiculo") ||
      key.includes("carro") ||
      key.includes("modelo") ||
      key.includes("interesse") ||
      key === "vehicle" ||
      key === "qual_veiculo" ||
      key === "qual_carro"
    ) {
      vehicleInterest = val;
      break;
    }
  }

  if (!vehicleInterest) {
    vehicleInterest = fallback?.adName || "Campanha Meta Ads";
  }

  // 5. Construção de Notas Contextuais
  const noteParts: string[] = [];
  if (fallback?.formId) noteParts.push(`Form ID: ${fallback.formId}`);
  if (fallback?.adId) noteParts.push(`Ad ID: ${fallback.adId}`);
  if (fallback?.adName) noteParts.push(`Campanha: ${fallback.adName}`);

  // Inclui perguntas extras do formulário nas notas
  for (const [key, val] of fieldsMap.entries()) {
    if (
      ![
        "full_name",
        "nome_completo",
        "nome",
        "first_name",
        "last_name",
        "name",
        "phone_number",
        "phone",
        "telefone",
        "whatsapp",
        "celular",
        "email",
        "e-mail",
      ].includes(key)
    ) {
      noteParts.push(`${key}: ${val}`);
    }
  }

  const notes =
    noteParts.length > 0
      ? noteParts.join(" | ")
      : "Lead gerado via formulário instantâneo Meta Ads";

  return {
    clientName,
    clientPhone,
    clientEmail,
    vehicleInterest,
    notes,
  };
}

/**
 * Resolve o registro de integração da Meta a partir do `page_id`.
 */
export async function resolveMetaIntegration(
  pageId?: string
): Promise<MetaIntegrationRecord | null> {
  if (!pageId || !isSupabaseServerConfigured()) {
    return null;
  }

  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("meta_integrations")
      .select("*")
      .eq("page_id", pageId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.warn(
        `[Meta Lead Service] Erro ao consultar meta_integrations para page_id "${pageId}":`,
        error.message
      );
      return null;
    }

    return (data as MetaIntegrationRecord) || null;
  } catch (err) {
    console.warn("[Meta Lead Service] Exceção ao consultar meta_integrations:", err);
    return null;
  }
}

/**
 * Processa o evento de leadgen da Meta, executando o ciclo completo de ingestão.
 */
export async function processMetaLeadgen(
  params: ProcessMetaLeadgenParams
): Promise<ProcessMetaLeadgenResult> {
  const { leadgenId, pageId, formId, adId, directData } = params;

  try {
    // 1. Resolução Multi-Tenant da Organização
    let organizationId = DEFAULT_DEMO_ORG_ID;
    let pageAccessToken: string | null = null;

    if (pageId) {
      const integration = await resolveMetaIntegration(pageId);
      if (integration?.organization_id) {
        organizationId = integration.organization_id;
        pageAccessToken = integration.page_access_token;
      }
    }

    // 2. Obtenção dos dados do formulário (Graph API ou Direct Data)
    let clientName = directData?.name || "Lead Meta Ads";
    let clientPhone = directData?.phone ? sanitizeMetaPhone(directData.phone) : "";
    let clientEmail: string | null = directData?.email || null;
    let vehicleInterest = directData?.vehicle || "Campanha Meta Ads";
    let notes =
      directData?.notes ||
      `Meta Leadgen ID: ${leadgenId}${formId ? ` | Form: ${formId}` : ""}${
        adId ? ` | Ad: ${adId}` : ""
      }`;

    // Se temos token de acesso da página ou se não temos directData completo, busca na Graph API
    if (pageAccessToken && (!directData?.name || !directData?.phone)) {
      const graphData = await fetchMetaLeadgenData(leadgenId, pageAccessToken);
      if (graphData) {
        const normalized = normalizeMetaFieldData(graphData.field_data, {
          adName: graphData.ad_name,
          formId: graphData.form_id || formId,
          adId: graphData.ad_id || adId,
          pageId: graphData.page_id || pageId,
        });

        if (normalized.clientName) clientName = normalized.clientName;
        if (normalized.clientPhone) clientPhone = normalized.clientPhone;
        if (normalized.clientEmail) clientEmail = normalized.clientEmail;
        if (normalized.vehicleInterest) vehicleInterest = normalized.vehicleInterest;
        if (normalized.notes) notes = normalized.notes;
      }
    } else if (directData?.field_data && Array.isArray(directData.field_data)) {
      const normalized = normalizeMetaFieldData(directData.field_data as MetaFieldItem[], {
        formId,
        adId,
        pageId,
      });
      if (normalized.clientName) clientName = normalized.clientName;
      if (normalized.clientPhone) clientPhone = normalized.clientPhone;
      if (normalized.clientEmail) clientEmail = normalized.clientEmail;
      if (normalized.vehicleInterest) vehicleInterest = normalized.vehicleInterest;
      if (normalized.notes) notes = normalized.notes;
    }

    // Fallback de telefone caso esteja vazio
    if (!clientPhone) {
      clientPhone = "5511999990000";
    }

    // 3. Match Inteligente com Estoque da Concessionária
    const matchedVehicle = await matchVehicleInInventory(
      organizationId,
      vehicleInterest && vehicleInterest !== "Campanha Meta Ads"
        ? { model: vehicleInterest }
        : undefined
    );

    const vehicleName = matchedVehicle
      ? `${matchedVehicle.brand} ${matchedVehicle.model} ${
          matchedVehicle.version || ""
        }`.trim()
      : vehicleInterest;
    const vehicleId = matchedVehicle?.id || null;
    const estimatedValue = matchedVehicle ? matchedVehicle.price : 0;

    // 4. Distribuição por Roleta Comercial
    let sellerInfo = { sellerId: null as string | null, sellerName: "Fila Geral" };
    try {
      const resolved = await resolveAssignedSellerInfo(null, organizationId);
      sellerInfo = {
        sellerId: resolved.sellerId ?? null,
        sellerName: resolved.sellerName,
      };
    } catch (roletaErr) {
      console.warn("[Meta Lead Service] Roleta Warning:", roletaErr);
    }

    const shortCode = generateShortCode(6);
    let leadId = `lead_meta_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    const initialStatus: LeadStatus = "novo";

    // 5. Persistência no Supabase
    if (isSupabaseServerConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const adminSupabase = createAdminClient();
        const { data: inserted, error: insertError } = await adminSupabase
          .from("leads")
          .insert({
            organization_id: organizationId,
            tenant_id: organizationId,
            name: clientName,
            phone: clientPhone,
            email: clientEmail,
            vehicle_interest: vehicleName,
            status: initialStatus,
            origin: "instagram",
            seller_name: sellerInfo.sellerName,
            seller_id: sellerInfo.sellerId,
            notes,
            short_code: shortCode,
            custom_fields: {
              vehicle_id: vehicleId,
              vehicle_name: vehicleName,
              estimated_value: estimatedValue,
              source: "meta_ads",
              leadgen_id: leadgenId,
              page_id: pageId,
              form_id: formId,
              ad_id: adId,
            },
            last_contact_at: nowIso,
            created_at: nowIso,
          } as never)
          .select("id")
          .maybeSingle();

        if (insertError) {
          console.warn("[Meta Lead Service] Insert Fallback:", insertError.message);
          const { data: fallbackInserted } = await adminSupabase
            .from("leads")
            .insert({
              organization_id: organizationId,
              name: clientName,
              phone: clientPhone,
              email: clientEmail,
              vehicle_interest: vehicleName,
              status: initialStatus,
              origin: "instagram",
              seller_name: sellerInfo.sellerName,
              seller_id: sellerInfo.sellerId,
              notes,
              short_code: shortCode,
              last_contact_at: nowIso,
              created_at: nowIso,
            } as never)
            .select("id")
            .maybeSingle();

          if (fallbackInserted?.id) {
            leadId = fallbackInserted.id;
          }
        } else if (inserted?.id) {
          leadId = inserted.id;
        }
      } catch (dbErr) {
        console.error("[Meta Lead Service] DB Exception:", dbErr);
      }
    }

    // 6. Notificação Não-Bloqueante via WhatsApp
    void notifyAssignedSellerViaWhatsApp({
      lead: {
        id: leadId,
        name: clientName,
        phone: clientPhone,
        email: clientEmail,
        vehicle_name: vehicleName,
        vehicleInterest: vehicleName,
        source: "meta_ads",
        origin: "instagram",
        short_code: shortCode,
      },
      sellerName: sellerInfo.sellerName,
      organizationId,
    });

    return {
      success: true,
      leadId,
      shortCode,
      assignedTo: sellerInfo.sellerName,
      organizationId,
      clientName,
      clientPhone,
      vehicleInterest: vehicleName,
    };
  } catch (error) {
    console.error("[Meta Lead Service] Fatal Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}
