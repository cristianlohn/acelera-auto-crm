/**
 * @file meta-parser.ts
 * @description Parser oficial para Facebook / Instagram Lead Ads (Graph API e Webhooks normalizados).
 */

import type { NormalizedLeadInput } from "../types";

export function parseMetaAdsPayload(body: Record<string, unknown> | null | undefined): NormalizedLeadInput {
  const b = (body || {}) as Record<string, unknown>;
  const rawFieldData = b.field_data;
  const fieldData: Array<{ name: string; values: string[] }> = Array.isArray(rawFieldData)
    ? (rawFieldData as Array<{ name: string; values: string[] }>)
    : [];
  const fieldsMap = new Map<string, string>();

  fieldData.forEach((f) => {
    if (f.name && f.values?.[0]) {
      fieldsMap.set(f.name.toLowerCase(), f.values[0]);
    }
  });

  const clientName =
    fieldsMap.get("full_name") ||
    fieldsMap.get("nome_completo") ||
    fieldsMap.get("name") ||
    (b.name ? String(b.name) : "Lead Instagram/Facebook");

  const clientPhone =
    fieldsMap.get("phone_number") ||
    fieldsMap.get("telefone") ||
    fieldsMap.get("whatsapp") ||
    (b.phone ? String(b.phone) : "");

  const clientEmail = fieldsMap.get("email") || (b.email ? String(b.email) : undefined);

  // Extrai intenção de veículo por campos comuns de formulários de concessionária
  const vehicleText =
    fieldsMap.get("veiculo") ||
    fieldsMap.get("carro") ||
    fieldsMap.get("modelo") ||
    fieldsMap.get("veiculo_interesse") ||
    (b.vehicle_name ? String(b.vehicle_name) : "");

  return {
    externalId: String(b.leadgen_id || b.id || "").trim() || undefined,
    source: "meta_ads",
    clientName,
    clientPhone,
    clientEmail,
    message:
      fieldsMap.get("mensagem") ||
      `Interesse capturado em campanha: ${b.ad_name ? String(b.ad_name) : "Campanha Meta"}`,
    vehicleHint: {
      model: vehicleText || undefined,
    },
  };
}
