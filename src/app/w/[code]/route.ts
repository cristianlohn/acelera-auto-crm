/**
 * @file route.ts
 * @description Endpoint encurtado (/w/[code]) para disparar WhatsApp, fechar SLA e registrar primeiro contato do vendedor.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildWelcomeCustomerMessage } from "@/lib/services/whatsapp/templates";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> | { code: string } }
) {
  const params = await Promise.resolve(context.params);
  const { code } = params;
  const userAgent = request.headers.get("user-agent") || "";

  // Robô de preview da Meta/WhatsApp (facebookexternalhit, Facebot, Twitterbot, TelegramBot, ou WhatsApp sem Mozilla/5.0)
  const isCrawler =
    userAgent.includes("facebookexternalhit") ||
    userAgent.includes("Facebot") ||
    userAgent.includes("Twitterbot") ||
    userAgent.includes("TelegramBot") ||
    (userAgent.includes("WhatsApp") && !userAgent.includes("Mozilla/5.0"));

  const supabaseAdmin = createAdminClient();
  const { data: lead, error } = await supabaseAdmin
    .from("leads")
    .select("id, name, phone, vehicle_interest, status, first_contact_at, organization_id, custom_fields, seller_name")
    .eq("short_code", code)
    .single();

  if (error || !lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
  }

  const cleanPhone = (lead.phone || "").replace(/\D/g, "");
  const targetPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
  const vehicleName =
    ((lead.custom_fields as Record<string, unknown>)?.vehicle_name as string | undefined) ||
    lead.vehicle_interest ||
    undefined;

  let orgName: string | undefined;
  if (lead.organization_id) {
    try {
      const orgQuery = supabaseAdmin
        .from("organizations")
        .select("name")
        .eq("id", lead.organization_id);
      const res = typeof orgQuery.maybeSingle === "function"
        ? await orgQuery.maybeSingle()
        : typeof orgQuery.single === "function"
        ? await orgQuery.single()
        : null;
      if (res?.data?.name) {
        orgName = res.data.name;
      }
    } catch {
      // Ignora erro ao obter organização
    }
  }

  const message = buildWelcomeCustomerMessage({
    customerName: lead.name,
    sellerName: (lead as Record<string, unknown>).seller_name as string | undefined,
    organizationName: orgName,
    vehicle: vehicleName,
  });
  const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;

  // Se for crawler, apenas redireciona sem tocar no banco
  if (isCrawler) {
    return NextResponse.redirect(whatsappUrl, { status: 302 });
  }

  // Ação real do vendedor: atualiza status, last_contact_at e trava cronômetro de SLA
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    updated_at: now,
    last_contact_at: now,
  };

  // Trava o cronômetro do SLA se ainda não registrado
  if (!lead.first_contact_at) {
    updates.first_contact_at = now;
  }

  // Avança a etapa caso ainda esteja no início do funil
  const initialStages = ["new", "received", "lead", "inbox", "novo", null, undefined];
  if (initialStages.includes(lead.status as string)) {
    updates.status = "atendimento";
  }

  const { error: updateError } = await supabaseAdmin
    .from("leads")
    .update(updates as never)
    .eq("id", lead.id);

  if (updateError) {
    console.error("[Route /w/ Error ao atualizar lead]:", updateError);
  } else {
    console.log(`[Route /w/] Lead ${lead.id} avançado para primeiro atendimento com sucesso.`);
  }

  try {
    await supabaseAdmin.from("lead_history").insert({
      lead_id: lead.id,
      organization_id: lead.organization_id,
      action: "first_contact_whatsapp_link",
      description: "Primeiro contato disparado pelo vendedor via link curto de WhatsApp. SLA pausado.",
      created_at: now,
    } as never);
  } catch {
    // Ignora falhas caso a tabela de histórico não esteja ativa
  }

  return NextResponse.redirect(whatsappUrl, { status: 302 });
}

