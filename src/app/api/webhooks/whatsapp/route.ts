/**
 * @file route.ts
 * @description Endpoint de Ingestão de Webhooks do WhatsApp Multi-Gateway (POST /api/webhooks/whatsapp).
 *
 * Funcionalidades:
 * - Autenticação multi-tenant via token de webhook (searchParams `?token=...` ou header `x-webhook-token`)
 *   validado contra `organizations.webhook_token`.
 * - Suporte a múltiplos gateways: Evolution API, Z-API e Meta Cloud (WhatsApp Business Cloud API).
 * - Ignora mensagens enviadas pelo próprio número da loja (`fromMe: true`) com HTTP 200 { status: "ignored" }.
 * - Ignora mensagens enviadas por membros da equipe interna da concessionária (consultores, gerentes, owners)
 *   com HTTP 200 { status: "ignored", reason: "Mensagem originada por membro da equipe interna" }.
 * - Sanitização e normalização de telefones brasileiros (DDI 55 + DDD + número).
 * - Deduplicação por organização e telefone:
 *   - Se existente: registra evento `WHATSAPP_MESSAGE_RECEIVED` em `lead_history` e retorna 200 { status: "updated", action: "message_appended" }.
 *   - Se novo: seleciona vendedor ativo em `organization_members` pelo `last_lead_assigned_at` mais antigo/nulo,
 *     atualiza o vendedor, insere o lead com SLA de 15 minutos, registra `LEAD_CREATED` em `lead_history`
 *     e retorna 201 { status: "created", leadId, assignedTo, slaLimit }.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateShortCode } from "@/lib/utils/nanoid";

/**
 * Extrai o token de autenticação da requisição (query params ou headers).
 */
export function extractWebhookToken(request: NextRequest): string | null {
  const queryToken = request.nextUrl.searchParams.get("token");
  if (queryToken && queryToken.trim()) {
    return queryToken.trim();
  }

  const headerToken =
    request.headers.get("x-webhook-token") ||
    request.headers.get("x-api-key") ||
    request.headers.get("token");
  if (headerToken && headerToken.trim()) {
    return headerToken.trim();
  }

  return null;
}

/**
 * Sanitiza e normaliza o telefone para formato canônico DDI 55 + DDD + número.
 * Remove sufixos como `@s.whatsapp.net`, `@c.us` e pontuações.
 */
export function normalizeWhatsAppPhone(rawPhone?: string | null): string {
  if (!rawPhone || typeof rawPhone !== "string") return "";

  // 1. Remove sufixo do JID do WhatsApp
  const withoutJid = rawPhone.split("@")[0].trim();

  // 2. Extrai apenas dígitos
  let digits = withoutJid.replace(/\D/g, "");

  // 3. Normaliza prefixo DDI 55 para números de 10 ou 11 dígitos
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) {
    digits = `55${digits}`;
  }

  return digits;
}

interface ExtractedMessageData {
  fromMe: boolean;
  phone: string;
  senderName: string | null;
  messageText: string | null;
  isStatusUpdate: boolean;
}

/**
 * Faz o parsing agnóstico de payloads dos gateways Evolution API, Z-API e Meta Cloud.
 */
export function parseWhatsAppPayload(body: Record<string, unknown>): ExtractedMessageData {
  let fromMe = false;
  let rawPhone = "";
  let senderName: string | null = null;
  let messageText: string | null = null;
  let isStatusUpdate = false;

  // 1. Detecção na raiz ou flag global
  if (body.fromMe === true) {
    fromMe = true;
  }

  // 2. Gateway: Evolution API
  // Estrutura: data.key.remoteJid, data.key.fromMe, data.pushName, data.message
  const data = (body.data && typeof body.data === "object" ? body.data : null) as Record<
    string,
    unknown
  > | null;
  const key = ((data?.key || body.key) && typeof (data?.key || body.key) === "object"
    ? data?.key || body.key
    : null) as Record<string, unknown> | null;

  if (key) {
    if (key.fromMe === true) {
      fromMe = true;
    }
    if (typeof key.remoteJid === "string") {
      rawPhone = key.remoteJid;
    }
  }

  if (data) {
    if (typeof data.pushName === "string" && data.pushName.trim()) {
      senderName = data.pushName.trim();
    }
    const message = (data.message && typeof data.message === "object"
      ? data.message
      : null) as Record<string, unknown> | null;

    if (message) {
      if (typeof message.conversation === "string") {
        messageText = message.conversation;
      } else if (
        message.extendedTextMessage &&
        typeof message.extendedTextMessage === "object" &&
        typeof (message.extendedTextMessage as Record<string, unknown>).text === "string"
      ) {
        messageText = (message.extendedTextMessage as Record<string, unknown>).text as string;
      }
    }
  }

  // 3. Gateway: Z-API
  // Estrutura: phone, senderName, text.message, fromMe
  if (!rawPhone && typeof body.phone === "string") {
    rawPhone = body.phone;
  }
  if (!senderName && typeof body.senderName === "string") {
    senderName = body.senderName.trim();
  }
  if (!messageText) {
    const textObj = (body.text && typeof body.text === "object" ? body.text : null) as Record<
      string,
      unknown
    > | null;
    if (textObj && typeof textObj.message === "string") {
      messageText = textObj.message;
    } else if (typeof body.message === "string") {
      messageText = body.message;
    }
  }

  // 4. Gateway: Meta Cloud (WhatsApp Business Cloud API)
  // Estrutura: entry[0].changes[0].value.messages[0] e contacts[0]
  if (Array.isArray(body.entry)) {
    const entry = body.entry[0] as Record<string, unknown> | undefined;
    const changes = Array.isArray(entry?.changes)
      ? (entry?.changes[0] as Record<string, unknown> | undefined)
      : undefined;
    const value = (changes?.value && typeof changes.value === "object"
      ? changes.value
      : null) as Record<string, unknown> | null;

    if (value) {
      // Se for apenas notificação de status de entrega/leitura (sem messages)
      if (Array.isArray(value.statuses) && (!Array.isArray(value.messages) || value.messages.length === 0)) {
        isStatusUpdate = true;
      }

      if (Array.isArray(value.messages) && value.messages.length > 0) {
        const firstMsg = value.messages[0] as Record<string, unknown>;
        if (typeof firstMsg.from === "string") {
          rawPhone = firstMsg.from;
        }
        if (firstMsg.fromMe === true) {
          fromMe = true;
        }
        const textWrapper = (firstMsg.text && typeof firstMsg.text === "object"
          ? firstMsg.text
          : null) as Record<string, unknown> | null;
        if (textWrapper && typeof textWrapper.body === "string") {
          messageText = textWrapper.body;
        }
      }

      if (Array.isArray(value.contacts) && value.contacts.length > 0) {
        const firstContact = value.contacts[0] as Record<string, unknown>;
        if (!rawPhone && typeof firstContact.wa_id === "string") {
          rawPhone = firstContact.wa_id;
        }
        const profile = (firstContact.profile && typeof firstContact.profile === "object"
          ? firstContact.profile
          : null) as Record<string, unknown> | null;
        if (profile && typeof profile.name === "string") {
          senderName = profile.name.trim();
        }
      }
    }
  }

  // 5. Fallback genérico para propriedades comuns
  if (!senderName && typeof body.name === "string" && body.name.trim()) {
    senderName = body.name.trim();
  }
  if (!senderName && typeof body.pushName === "string" && body.pushName.trim()) {
    senderName = body.pushName.trim();
  }

  return {
    fromMe,
    phone: normalizeWhatsAppPhone(rawPhone),
    senderName,
    messageText,
    isStatusUpdate,
  };
}

/**
 * Handler POST do Webhook do WhatsApp.
 */
export async function POST(request: NextRequest) {
  try {
    // -------------------------------------------------------------------------
    // 1. Autenticação por Token (searchParams ou x-webhook-token)
    // -------------------------------------------------------------------------
    const token = extractWebhookToken(request);
    if (!token) {
      return NextResponse.json(
        { error: "Token de webhook ausente." },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    // Consulta tenant pelo webhook_token
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, webhook_token, whatsapp_lead_capture_enabled")
      .eq("webhook_token", token)
      .maybeSingle();

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Token de webhook inválido ou organização não encontrada." },
        { status: 403 }
      );
    }

    const organizationId = org.id;

    // -------------------------------------------------------------------------
    // 1.1 Guarda de Captura de Leads (Preferências da Organização)
    // -------------------------------------------------------------------------
    if (org.whatsapp_lead_capture_enabled === false) {
      return NextResponse.json(
        {
          status: "ignored",
          reason: "Captura de leads desativada nas preferências da organização",
        },
        { status: 200 }
      );
    }

    // -------------------------------------------------------------------------
    // 2. Leitura e Parsing do Payload JSON
    // -------------------------------------------------------------------------
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Payload JSON inválido." },
        { status: 400 }
      );
    }

    const parsed = parseWhatsAppPayload(body);

    // Se o evento for apenas status update da Meta (leitura/entrega) ou enviado pela própria loja
    if (parsed.fromMe || parsed.isStatusUpdate) {
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }

    if (!parsed.phone || parsed.phone.length < 10) {
      return NextResponse.json(
        { error: "Telefone do remetente inválido ou não identificado no payload." },
        { status: 400 }
      );
    }

    // -------------------------------------------------------------------------
    // 3. Verificação de Membro da Equipe Interna (Segurança & Prevenção de Loop)
    // -------------------------------------------------------------------------
    // Caso o número remetente pertença a algum consultor, gerente ou dono da loja
    const { data: teamProfiles } = await supabase
      .from("profiles")
      .select("id, phone, role")
      .eq("organization_id", organizationId);

    const isTeamMember = (teamProfiles || []).some((profile) => {
      if (!profile.phone) return false;
      const memberNormalized = normalizeWhatsAppPhone(profile.phone);
      if (!memberNormalized) return false;

      if (memberNormalized === parsed.phone) return true;

      // Comparação sem DDI 55 caso algum esteja com/sem prefixo internacional
      const memberClean = memberNormalized.replace(/^55/, "");
      const incomingClean = parsed.phone.replace(/^55/, "");
      return memberClean === incomingClean;
    });

    if (isTeamMember) {
      return NextResponse.json(
        {
          status: "ignored",
          reason: "Mensagem originada por membro da equipe interna",
        },
        { status: 200 }
      );
    }

    // -------------------------------------------------------------------------
    // 4. Deduplicação de Contatos por Organização e Telefone
    // -------------------------------------------------------------------------
    // Busca se já existe lead com este telefone
    const { data: existingLeads } = await supabase
      .from("leads")
      .select("id, organization_id, phone, name")
      .eq("organization_id", organizationId)
      .eq("phone", parsed.phone);

    let existingLead = existingLeads && existingLeads.length > 0 ? existingLeads[0] : null;

    // Fallback de busca sem DDI 55 se o lead tiver sido salvo sem o prefixo
    if (!existingLead && parsed.phone.startsWith("55")) {
      const phoneWithout55 = parsed.phone.slice(2);
      const { data: altLeads } = await supabase
        .from("leads")
        .select("id, organization_id, phone, name")
        .eq("organization_id", organizationId)
        .eq("phone", phoneWithout55);

      if (altLeads && altLeads.length > 0) {
        existingLead = altLeads[0];
      }
    }

    const now = new Date();
    const nowIso = now.toISOString();

    if (existingLead) {
      // Lead já existe: anexa a mensagem ao histórico sem criar novo lead
      await supabase.from("lead_history").insert({
        lead_id: existingLead.id,
        organization_id: organizationId,
        action: "WHATSAPP_MESSAGE_RECEIVED",
        description: parsed.messageText || "Mensagem recebida via WhatsApp",
        created_at: nowIso,
      });

      return NextResponse.json(
        { status: "updated", action: "message_appended" },
        { status: 200 }
      );
    }

    // -------------------------------------------------------------------------
    // 5. Novo Lead: Roleta de Vendedores & Cálculo de SLA de 15 minutos
    // -------------------------------------------------------------------------
    // Seleciona vendedor ativo em organization_members com last_lead_assigned_at mais antigo (ou nulo)
    const { data: members } = await supabase
      .from("organization_members")
      .select("id, user_id, organization_id, role, status, last_lead_assigned_at")
      .eq("organization_id", organizationId)
      .eq("status", "active");

    const activeMembers = (members || []).filter((m) => m.status === "active");

    activeMembers.sort((a, b) => {
      if (!a.last_lead_assigned_at && !b.last_lead_assigned_at) return 0;
      if (!a.last_lead_assigned_at) return -1;
      if (!b.last_lead_assigned_at) return 1;
      return new Date(a.last_lead_assigned_at).getTime() - new Date(b.last_lead_assigned_at).getTime();
    });

    const selectedSeller = activeMembers.length > 0 ? activeMembers[0] : null;
    const assignedTo = selectedSeller ? selectedSeller.user_id || selectedSeller.id : null;

    // Atualiza last_lead_assigned_at do vendedor selecionado
    if (selectedSeller) {
      await supabase
        .from("organization_members")
        .update({ last_lead_assigned_at: nowIso })
        .eq("id", selectedSeller.id);
    }

    // Cálculo do prazo de SLA: NOW + 15 minutos
    const slaLimit = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
    const shortCode = generateShortCode(6);
    const clientName = parsed.senderName || "Lead WhatsApp";

    // Insere o novo lead no banco
    const { data: createdLead, error: insertError } = await supabase
      .from("leads")
      .insert({
        organization_id: organizationId,
        name: clientName,
        phone: parsed.phone,
        source: "whatsapp_central",
        stage: "novos_leads",
        status: "novo",
        origin: "whatsapp",
        sla_deadline: slaLimit,
        assigned_to: assignedTo,
        seller_name: "Roleta Automática",
        vehicle_interest: "Interesse Geral via WhatsApp",
        notes: parsed.messageText || null,
        short_code: shortCode,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[WhatsApp Webhook] Erro ao inserir lead:", insertError.message);
      return NextResponse.json(
        { error: "Erro interno ao cadastrar o lead." },
        { status: 500 }
      );
    }

    const leadId = createdLead?.id;

    // Registra evento de criação no histórico
    if (leadId) {
      await supabase.from("lead_history").insert({
        lead_id: leadId,
        organization_id: organizationId,
        action: "LEAD_CREATED",
        description: parsed.messageText
          ? `Lead criado via WhatsApp: ${parsed.messageText}`
          : "Lead criado via webhook WhatsApp Central",
        created_at: nowIso,
      });
    }

    // Disparo da resposta automática de boas-vindas via Evolution API
    const evolutionUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, "");
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    const instanceName = `org_${organizationId.replace(/-/g, "_")}`;

    if (evolutionUrl && evolutionKey) {
      try {
        let sellerFirstName = "Consultor";
        if (assignedTo) {
          const { data: sellerProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", assignedTo)
            .maybeSingle();

          if (sellerProfile?.full_name) {
            sellerFirstName = sellerProfile.full_name.trim().split(" ")[0] || "Consultor";
          }
        }

        const customerName = parsed.senderName ? parsed.senderName.trim() : "Cliente";
        const storeName = org.name || "Nossa Loja";
        const welcomeMessage = `Olá, ${customerName}! Seja bem-vindo(a) à ${storeName}! 👋\n\nNosso consultor ${sellerFirstName} já recebeu sua ficha e vai continuar seu atendimento por aqui em instantes. 🚗💨`;

        await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
          method: "POST",
          headers: {
            apikey: evolutionKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            number: parsed.phone,
            text: welcomeMessage,
          }),
        });
      } catch (sendErr) {
        console.error("[WhatsApp Webhook] Erro ao enviar mensagem de boas-vindas:", sendErr);
      }
    }

    // Retorna 201 Created com os dados especificados
    return NextResponse.json(
      {
        status: "created",
        leadId,
        assignedTo,
        slaLimit,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[WhatsApp Webhook Fatal Error]", error);
    return NextResponse.json(
      { error: "Erro interno ao processar webhook do WhatsApp." },
      { status: 500 }
    );
  }
}
