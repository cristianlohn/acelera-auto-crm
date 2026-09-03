/**
 * @file route.ts
 * @description Endpoint encurtado (/w/[code]) para disparar WhatsApp, fechar SLA e registrar primeiro contato do vendedor.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> | { code: string } }
) {
  const params = await Promise.resolve(context.params);
  const { code } = params;
  const userAgent = request.headers.get("user-agent") || "";

  // Bloqueio de robôs de link preview (WhatsApp, Facebook, Twitter, Telegram, etc.)
  const isPreviewBot = /facebookexternalhit|WhatsApp|Facebot|Twitterbot|TelegramBot/i.test(userAgent);

  const supabaseAdmin = createAdminClient();
  const { data: lead, error } = await supabaseAdmin
    .from("leads")
    .select("id, name, phone, vehicle_interest, status, first_contact_at, organization_id, custom_fields")
    .eq("short_code", code)
    .single();

  if (error || !lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
  }

  const cleanPhone = (lead.phone || "").replace(/\D/g, "");
  const targetPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
  const firstName = (lead.name || "Cliente").trim().split(" ")[0];
  const vehicleName =
    (lead.custom_fields as Record<string, unknown>)?.vehicle_name ||
    lead.vehicle_interest ||
    "";
  const vehiclePart = vehicleName ? ` no ${vehicleName}` : "";
  const message = `Olá ${firstName}, tudo bem? Sou da concessionária. Vi seu interesse${vehiclePart}. Como posso te ajudar hoje?`;
  const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;

  if (isPreviewBot) {
    return NextResponse.redirect(whatsappUrl, { status: 302 });
  }

  // Ação real do vendedor: atualiza status e fecha SLA
  const now = new Date().toISOString();
  await supabaseAdmin
    .from("leads")
    .update({
      updated_at: now,
      ...(lead.first_contact_at ? {} : { first_contact_at: now }),
      ...(lead.status === "novo" ? { status: "atendimento" } : {}),
    })
    .eq("id", lead.id);

  try {
    await supabaseAdmin.from("lead_history").insert({
      lead_id: lead.id,
      organization_id: lead.organization_id,
      action: "first_contact_whatsapp_link",
      description: "Primeiro contato disparado pelo vendedor via link curto de WhatsApp. SLA pausado.",
      created_at: now,
    });
  } catch {}

  return NextResponse.redirect(whatsappUrl, { status: 302 });
}
