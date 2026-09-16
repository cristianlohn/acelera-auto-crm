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
import {
  buildNewLeadAlertMessage,
  buildWelcomeCustomerMessage,
} from "@/lib/services/whatsapp/templates";

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
 * Verifica se o papel do membro é comercial (vendedor / consultor / sdr).
 * Suporta aliases canônicos em inglês e português: 'seller', 'vendedor', 'vendedora', etc.
 */
export function isSellerRole(role?: unknown): boolean {
  if (!role || typeof role !== "string") return false;
  const r = role.toLowerCase().trim();
  return [
    "seller",
    "vendedor",
    "vendedora",
    "consultor",
    "consultora",
    "sdr",
    "sellers",
    "vendedores",
  ].includes(r);
}

/**
 * Verifica se o membro da equipe está com plantão ativo / disponível.
 * Avalia colunas da tabela profiles: in_roulette (canônica), is_on_duty, is_available, plantao_active.
 */
export function isMemberOnDuty(profile: Record<string, unknown>): boolean {
  // 1. Verificações explícitas de plantão desligado
  if (profile.in_roulette === false) return false;
  if (profile.is_on_duty === false) return false;
  if (profile.is_available === false) return false;
  if (profile.plantao_active === false) return false;

  // 2. Verificações explícitas de plantão ativo
  if (
    profile.in_roulette === true ||
    profile.is_on_duty === true ||
    profile.is_available === true ||
    profile.plantao_active === true
  ) {
    return true;
  }

  // 3. Por padrão no banco, in_roulette é NOT NULL DEFAULT TRUE
  return true;
}

/**
 * Verifica se o membro está ativo na organização.
 */
export function isMemberActive(profile: Record<string, unknown>): boolean {
  if (!profile.status) return true;
  const s = String(profile.status).toLowerCase().trim();
  return s === "active" || s === "ativo";
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
    // Consulta membros da equipe na tabela profiles da organização
    const { data: teamProfilesRows } = await supabase
      .from("profiles")
      .select("*")
      .eq("organization_id", organizationId);

    // Interface para candidatos elegíveis na roleta
    interface RouletteCandidate {
      id: string;
      user_id?: string;
      _org_member_id?: string;
      organization_id?: string;
      full_name?: string | null;
      name?: string | null;
      role?: string | null;
      phone?: string | null;
      in_roulette?: boolean | null;
      status?: string | null;
      last_lead_assigned_at?: string | null;
      [key: string]: unknown;
    }

    // Filtra membros da organização que estejam ativos e com plantão ligado
    const onDutyProfiles: RouletteCandidate[] = (teamProfilesRows || [])
      .map((p) => p as unknown as RouletteCandidate)
      .filter((p) => isMemberActive(p) && isMemberOnDuty(p));

    // Prioriza membros com papel comercial ('seller', 'vendedor', etc.)
    let eligibleCandidates: RouletteCandidate[] = onDutyProfiles.filter((p) =>
      isSellerRole(p.role)
    );

    // Se nenhum vendedor estiver em plantão, aceita qualquer membro de plantão da organização (ex: gerente/admin)
    if (eligibleCandidates.length === 0 && onDutyProfiles.length > 0) {
      eligibleCandidates = onDutyProfiles;
    }

    // Fallback de retrocompatibilidade: se profiles não tiver membros em plantão, verifica organization_members
    if (eligibleCandidates.length === 0) {
      const { data: fallbackMembers } = await supabase
        .from("organization_members")
        .select("id, user_id, organization_id, role, status, last_lead_assigned_at")
        .eq("organization_id", organizationId)
        .eq("status", "active");

      const activeFallback = (fallbackMembers || []).filter((m) => m.status === "active");
      const sellerFallback = activeFallback.filter((m) => isSellerRole(m.role));
      eligibleCandidates = (sellerFallback.length > 0 ? sellerFallback : activeFallback).map((m) => ({
        ...m,
        id: m.user_id || m.id,
        _org_member_id: m.id,
      }));
    }

    // Ordenação da roleta: prioriza vendedor com last_lead_assigned_at mais antigo (ou nulo)
    eligibleCandidates.sort((a, b) => {
      const aTime = a.last_lead_assigned_at;
      const bTime = b.last_lead_assigned_at;
      if (!aTime && !bTime) return 0;
      if (!aTime) return -1;
      if (!bTime) return 1;
      return new Date(String(aTime)).getTime() - new Date(String(bTime)).getTime();
    });

    const selectedSeller = eligibleCandidates.length > 0 ? eligibleCandidates[0] : null;
    const assignedTo = selectedSeller
      ? (selectedSeller.user_id || selectedSeller.id)
      : null;

    // Atualiza last_lead_assigned_at do vendedor selecionado
    if (selectedSeller) {
      try {
        await (supabase.from("profiles") as unknown as {
          update: (data: Record<string, unknown>) => {
            eq: (col: string, val: string) => Promise<unknown>;
          };
        })
          .update({ last_lead_assigned_at: nowIso })
          .eq("id", selectedSeller.id);
      } catch {
        // Silencioso se coluna não existir na tabela profiles
      }

      try {
        const orgMemberId = selectedSeller._org_member_id || selectedSeller.id;
        await supabase
          .from("organization_members")
          .update({ last_lead_assigned_at: nowIso })
          .eq("id", orgMemberId);
      } catch {
        // Silencioso se organization_members não existir
      }
    }

    // Cálculo do prazo de SLA: NOW + 15 minutos
    const slaLimit = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
    const shortCode = generateShortCode(6);
    const clientName = parsed.senderName || "Lead WhatsApp";
    const sellerFullName = selectedSeller
      ? ((selectedSeller as Record<string, unknown>).full_name as string) ||
        ((selectedSeller as Record<string, unknown>).name as string) ||
        "Roleta Automática"
      : "Roleta Automática";

    // Identifica se há veículo específico informado no payload
    const rawVehicle =
      (typeof body.vehicle_interest === "string" && body.vehicle_interest.trim() ? body.vehicle_interest.trim() : null) ||
      (typeof body.vehicleInterest === "string" && body.vehicleInterest.trim() ? body.vehicleInterest.trim() : null) ||
      (typeof body.vehicle_name === "string" && body.vehicle_name.trim() ? body.vehicle_name.trim() : null) ||
      (typeof body.vehicle === "string" && body.vehicle.trim() ? body.vehicle.trim() : null) ||
      null;

    const specificVehicle =
      rawVehicle &&
      !rawVehicle.toLowerCase().includes("interesse geral") &&
      !rawVehicle.toLowerCase().includes("veículo de interesse") &&
      !rawVehicle.toLowerCase().includes("veiculo de interesse") &&
      rawVehicle.toLowerCase() !== "geral" &&
      !rawVehicle.toLowerCase().includes("não informado") &&
      !rawVehicle.toLowerCase().includes("nao informado") &&
      !rawVehicle.toLowerCase().includes("sem veículo") &&
      !rawVehicle.toLowerCase().includes("sem veiculo")
        ? rawVehicle
        : null;

    // Insere o novo lead no banco com assigned_to e seller_name
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
        seller_name: sellerFullName,
        vehicle_interest: specificVehicle || "Interesse Geral",
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

    // Busca dados do perfil do vendedor sorteado para composição das mensagens
    let sellerProfileData: { full_name?: string | null; phone?: string | null } | null = null;
    if (assignedTo) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", assignedTo)
          .maybeSingle();
        sellerProfileData = profile;
      } catch (err) {
        console.warn("[WhatsApp Webhook] Falha ao consultar perfil do vendedor:", err);
      }
    }

    // Disparo da resposta automática de boas-vindas via Evolution API
    const evolutionUrl = (process.env.EVOLUTION_API_URL || process.env.WHATSAPP_API_URL)?.replace(/\/$/, "");
    const evolutionKey = process.env.EVOLUTION_API_KEY || process.env.WHATSAPP_API_KEY;
    const instanceName = `org_${organizationId.replace(/-/g, "_")}`;

    if (evolutionUrl && evolutionKey) {
      try {
        let sellerFirstName = "Consultor";
        if (sellerProfileData?.full_name) {
          sellerFirstName = sellerProfileData.full_name.trim().split(" ")[0] || "Consultor";
        } else if (sellerFullName && sellerFullName !== "Roleta Automática") {
          sellerFirstName = sellerFullName.trim().split(" ")[0] || "Consultor";
        }

        // Saudação pessoal com o primeiro nome do cliente (extraído de pushName / senderName)
        const rawCustomerName = parsed.senderName ? parsed.senderName.trim() : "";
        const customerFirstName = rawCustomerName ? rawCustomerName.split(/\s+/)[0] : "Cliente";

        const welcomeMessage = buildWelcomeCustomerMessage({
          customerName: customerFirstName,
          sellerName: sellerFirstName,
          organizationName: org?.name,
          vehicle: specificVehicle,
        });

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

    // Notificação do novo lead para o vendedor sorteado via Evolution API
    if (assignedTo && evolutionUrl && evolutionKey) {
      try {
        const rawSellerPhone =
          (selectedSeller?.phone as string | undefined) ||
          sellerProfileData?.phone ||
          null;

        if (rawSellerPhone) {
          // Sanitização do telefone: remove qualquer caractere não numérico
          let sanitizedSellerPhone = String(rawSellerPhone).replace(/\D/g, "");

          // Se tiver 10 ou 11 dígitos, adiciona o DDI '55' no início antes de disparar para a Evolution API
          if (
            sanitizedSellerPhone.length === 10 ||
            sanitizedSellerPhone.length === 11
          ) {
            sanitizedSellerPhone = `55${sanitizedSellerPhone}`;
          }

          if (sanitizedSellerPhone) {
            const sellerDisplayName =
              sellerProfileData?.full_name ||
              (selectedSeller?.full_name as string) ||
              sellerFullName ||
              "Vendedor";

            const sellerAlertMessage = buildNewLeadAlertMessage(
              {
                id: leadId,
                name: clientName,
                phone: parsed.phone,
                vehicleInterest: specificVehicle || "Interesse Geral",
                vehicle_name: specificVehicle || "Interesse Geral",
                source: "whatsapp_central",
                origin: "WhatsApp Central",
                short_code: shortCode,
                organization_name: org?.name,
              },
              {
                full_name: sellerDisplayName,
                phone: sanitizedSellerPhone,
              }
            );

            await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
              method: "POST",
              headers: {
                apikey: evolutionKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                number: sanitizedSellerPhone,
                text: sellerAlertMessage,
              }),
            });

            console.log(
              `[WhatsApp Webhook] Notificação de novo lead enviada com sucesso para vendedor ${sellerDisplayName} (${sanitizedSellerPhone})`
            );
          }
        } else {
          console.log(
            `[WhatsApp Webhook] Vendedor sorteado (${assignedTo}) não possui telefone cadastrado para receber alerta.`
          );
        }
      } catch (sellerNotificationErr) {
        console.error(
          "[WhatsApp Webhook] Erro ao enviar notificação de lead para o vendedor:",
          sellerNotificationErr
        );
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
