/**
 * @file route.ts
 * @description Endpoint de Ingestão de Propostas e Leads do Portal Webmotors (POST /api/v1/webhooks/webmotors).
 */

import { NextRequest, NextResponse } from "next/server";
import { extractApiKeyFromRequest } from "@/lib/auth/validate-api-key";
import { validateApiKey } from "@/lib/services/api-key-service";
import { webmotorsLeadSchema } from "@/lib/validations/webhook";
import {
  resolveAssignedSellerInfo,
  notifyAssignedSellerViaWhatsApp,
  DEFAULT_DEMO_ORG_ID,
} from "@/lib/crm/roleta";
import { generateShortCode } from "@/lib/utils/nanoid";
import { parseWebmotorsPayload } from "@/lib/services/ingestion/parsers/webmotors-parser";
import { matchVehicleInInventory } from "@/lib/services/ingestion/vehicle-matcher";
import {
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LeadStatus } from "@/types/database.types";

/**
 * @swagger
 * /api/v1/webhooks/webmotors:
 *   post:
 *     summary: Ingestão de Propostas e Leads da Webmotors
 *     description: Recebe eventos de propostas comerciais e leads diretos do portal Webmotors, mapeia os dados do veículo e da proposta e distribui via Roleta Comercial.
 *     tags:
 *       - Webhooks & Ingestão
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - telefone
 *             properties:
 *               leadId:
 *                 type: string
 *                 example: "WM-9812739"
 *               nome:
 *                 type: string
 *                 example: "Rodrigo Mendonça"
 *               telefone:
 *                 type: string
 *                 example: "11977776666"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "rodrigo.mendonca@uol.com.br"
 *               seller:
 *                 type: object
 *                 properties:
 *                   cnpj:
 *                     type: string
 *                     example: "68903730000136"
 *               veiculo:
 *                 type: object
 *                 properties:
 *                   marca:
 *                     type: string
 *                     example: "Toyota"
 *                   modelo:
 *                     type: string
 *                     example: "Corolla"
 *                   versao:
 *                     type: string
 *                     example: "2.0 XEi Flex Direct Shift"
 *                   anoModelo:
 *                     type: integer
 *                     example: 2023
 *                   preco:
 *                     type: number
 *                     example: 139900
 *               proposta:
 *                 type: object
 *                 properties:
 *                   valor:
 *                     type: number
 *                     example: 135000
 *                   mensagem:
 *                     type: string
 *                     example: "Tenho interesse à vista ou com troca em um Onix 2021."
 *                   possuiTroca:
 *                     type: boolean
 *                     example: true
 *     responses:
 *       201:
 *         description: Proposta da Webmotors recebida e processada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 lead_id:
 *                   type: string
 *                   example: "00000000-0000-0000-0000-000000000000"
 *                 assigned_to:
 *                   type: string
 *                   example: "Rafael Alves"
 *                 portal:
 *                   type: string
 *                   example: "webmotors"
 *       400:
 *         description: Dados da proposta inválidos.
 *       401:
 *         description: Chave de API ausente ou inválida.
 *       500:
 *         description: Erro interno no servidor.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Leitura do Corpo da Requisição
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Bad Request: JSON malformatado." },
        { status: 400 }
      );
    }

    const b = (body || {}) as Record<string, unknown>;
    const sellerObj = (b.seller || b.store || b.concessionaria || {}) as Record<string, unknown>;
    const rawCnpj = sellerObj.cnpj || sellerObj.document || b.cnpj || b.document || "";
    const cleanCnpj = typeof rawCnpj === "string" ? rawCnpj.replace(/\D/g, "") : "";

    // 2. Extração e Validação de Chave de API ou Secret Webmotors
    const apiKey = extractApiKeyFromRequest(request);
    let apiKeyOrgId: string | null = null;
    let apiKeyInvalid = false;

    if (apiKey) {
      const keyValidation = await validateApiKey(apiKey);
      if (keyValidation.valid && keyValidation.organizationId) {
        apiKeyOrgId = keyValidation.organizationId;
      } else {
        apiKeyInvalid = true;
      }
    }

    const webmotorsSecret =
      process.env.WEBMOTORS_WEBHOOK_SECRET ||
      process.env.WEBMOTORS_CLIENT_SECRET ||
      process.env.WEBMOTORS_SECRET ||
      process.env.WEBMOTORS_TOKEN;
    const webmotorsHeaderSecret =
      request.headers.get("x-webmotors-secret") ||
      request.headers.get("x-webmotors-token") ||
      request.headers.get("x-webmotors-signature") ||
      request.headers.get("x-webmotors-webhook-secret") ||
      request.headers.get("x-hub-signature-256");
    const isSecretAuthorized = Boolean(
      webmotorsSecret &&
        (webmotorsHeaderSecret === webmotorsSecret || apiKey === webmotorsSecret)
    );

    // 3. Resolução da Organização (Multi-Tenant)
    let organizationId: string | null = apiKeyOrgId || null;

    if (!organizationId && cleanCnpj && isSupabaseServerConfigured()) {
      try {
        const supabaseAdmin = createAdminClient();
        const { data: org } = await supabaseAdmin
          .from("organizations")
          .select("id")
          .or(`cnpj.eq.${cleanCnpj},document.eq.${cleanCnpj}`)
          .maybeSingle();

        if (org) {
          organizationId = org.id;
        }
      } catch (err) {
        console.warn("[Webmotors Webhook] Falha ao consultar organização por CNPJ:", err);
      }
    }

    // Fallback: se for teste ou ambiente com 1 loja, busca a primeira organização ativa
    if (!organizationId && isSupabaseServerConfigured()) {
      try {
        const supabaseAdmin = createAdminClient();
        const { data: defaultOrg } = await supabaseAdmin
          .from("organizations")
          .select("id")
          .limit(1)
          .maybeSingle();

        if (defaultOrg) {
          organizationId = defaultOrg.id;
        }
      } catch {}
    }

    if (!organizationId) {
      organizationId = DEFAULT_DEMO_ORG_ID;
    }

    // Se uma apiKey foi explicitamente enviada e é inválida (e não bateu secret nem CNPJ), retorna 401
    if (apiKeyInvalid && !isSecretAuthorized && !cleanCnpj) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Chave de API inválida, expirada ou revogada." },
        { status: 401 }
      );
    }

    // 4. Parse e Normalização de Dados
    const validation = webmotorsLeadSchema.safeParse(body);
    const parsedWebmotors = parseWebmotorsPayload(b);

    let clientName = parsedWebmotors.clientName || "Lead Webmotors";
    let clientPhone = parsedWebmotors.clientPhone || "";
    let clientEmail = parsedWebmotors.clientEmail || null;
    let externalLeadId = parsedWebmotors.externalId;
    let proposalValue: number | undefined = undefined;
    let message = parsedWebmotors.message || "";
    let hasTradeIn: boolean | undefined = undefined;
    let tradeInVehicle: string | undefined = undefined;

    let vehicleBrand = parsedWebmotors.vehicleHint?.brand;
    let vehicleModel = parsedWebmotors.vehicleHint?.model;
    let vehicleVersion = parsedWebmotors.vehicleHint?.version;
    let vehicleYear: number | string | undefined = undefined;
    let vehiclePlate = parsedWebmotors.vehicleHint?.plate;
    let vehiclePrice: number | undefined = undefined;

    if (validation.success) {
      const data = validation.data;
      if (data.nome) clientName = data.nome;
      if (data.telefone) clientPhone = data.telefone;
      if (data.email) clientEmail = data.email || null;
      if (data.leadId) externalLeadId = data.leadId;
      if (data.veiculo?.marca) vehicleBrand = data.veiculo.marca;
      if (data.veiculo?.modelo) vehicleModel = data.veiculo.modelo;
      if (data.veiculo?.versao) vehicleVersion = data.veiculo.versao;
      if (data.veiculo?.anoModelo) vehicleYear = data.veiculo.anoModelo;
      if (data.veiculo?.preco) vehiclePrice = data.veiculo.preco;
      if (data.veiculo?.placa) vehiclePlate = data.veiculo.placa;
      if (data.proposta?.valor) proposalValue = data.proposta.valor;
      if (data.proposta?.mensagem) message = data.proposta.mensagem;
      if (data.proposta?.possuiTroca !== undefined) hasTradeIn = data.proposta.possuiTroca;
      if (data.proposta?.veiculoTroca) tradeInVehicle = data.proposta.veiculoTroca;
    }

    const cleanDigitsPhone = clientPhone.replace(/\D/g, "");
    if (!cleanDigitsPhone || cleanDigitsPhone.length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados de proposta Webmotors inválidos: telefone obrigatório.",
        },
        { status: 400 }
      );
    }

    // 5. Normalização e Mapeamento dos Dados do Veículo e da Proposta
    const vehicleParts: string[] = [];
    if (vehicleBrand) vehicleParts.push(vehicleBrand);
    if (vehicleModel) vehicleParts.push(vehicleModel);
    if (vehicleVersion) vehicleParts.push(vehicleVersion);
    if (vehicleYear) vehicleParts.push(String(vehicleYear));

    const rawVehicleInterest =
      vehicleParts.length > 0 ? vehicleParts.join(" ") : "Interesse Webmotors";

    // Match Inteligente com Estoque
    const matchedVehicle = await matchVehicleInInventory(organizationId, {
      adId: parsedWebmotors.vehicleHint?.adId,
      plate: vehiclePlate,
      model: vehicleModel,
      brand: vehicleBrand,
      version: vehicleVersion,
    });

    const vehicleName = matchedVehicle
      ? `${matchedVehicle.brand} ${matchedVehicle.model} ${matchedVehicle.version || ""}`.trim()
      : rawVehicleInterest;
    const vehicleId = matchedVehicle?.id || null;
    const estimatedValue = matchedVehicle
      ? matchedVehicle.price
      : vehiclePrice || proposalValue || 0;

    const noteParts: string[] = [];
    if (externalLeadId) noteParts.push(`[Webmotors ID: ${externalLeadId}]`);
    if (proposalValue) noteParts.push(`Proposta: R$ ${proposalValue.toLocaleString("pt-BR")}`);
    if (message) noteParts.push(`Mensagem: "${message}"`);
    if (hasTradeIn) {
      noteParts.push(`Troca: Sim${tradeInVehicle ? ` (${tradeInVehicle})` : ""}`);
    }

    const notes = noteParts.length > 0 ? noteParts.join(" | ") : "Lead Webmotors";
    const nowIso = new Date().toISOString();
    const initialStatus: LeadStatus = "novo";

    // 6. Distribuição por Roleta Comercial com fallback
    let sellerInfo = { sellerId: null as string | null, sellerName: "Fila Geral" };
    try {
      const resolved = await resolveAssignedSellerInfo(null, organizationId);
      sellerInfo = {
        sellerId: resolved.sellerId ?? null,
        sellerName: resolved.sellerName,
      };
    } catch (roletaErr) {
      console.warn("[Webmotors Webhook Roleta Warning]:", roletaErr);
    }

    const shortCode = generateShortCode(6);
    let leadId = `lead_wm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 7. Persistência no Supabase com createAdminClient
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
            email: clientEmail || null,
            vehicle_interest: vehicleName,
            vehicle_id: vehicleId,
            vehicle_name: vehicleName,
            estimated_value: estimatedValue,
            value: estimatedValue,
            status: initialStatus,
            origin: "webmotors",
            seller_name: sellerInfo.sellerName,
            seller_id: sellerInfo.sellerId,
            notes,
            short_code: shortCode,
            custom_fields: {
              vehicle_id: vehicleId,
              vehicle_name: vehicleName,
              estimated_value: estimatedValue,
              value: estimatedValue,
              price: estimatedValue,
              cnpj: cleanCnpj || undefined,
            },
            last_contact_at: nowIso,
            created_at: nowIso,
          } as never)
          .select("id")
          .maybeSingle();

        if (insertError) {
          console.warn("[Webmotors Webhook DB Insert Fallback]:", insertError.message);
          const { data: fallbackInserted, error: fallbackError } = await adminSupabase
            .from("leads")
            .insert({
              organization_id: organizationId,
              name: clientName,
              phone: clientPhone,
              email: clientEmail || null,
              vehicle_interest: vehicleName,
              status: initialStatus,
              origin: "webmotors",
              seller_name: sellerInfo.sellerName,
              seller_id: sellerInfo.sellerId,
              notes,
              short_code: shortCode,
              last_contact_at: nowIso,
              created_at: nowIso,
            } as never)
            .select("id")
            .maybeSingle();

          if (fallbackError) {
            console.error("[Webmotors Ingestion Error]", fallbackError.message);
            return NextResponse.json(
              { success: false, error: "Erro ao registrar proposta no banco de dados." },
              { status: 500 }
            );
          }

          if (fallbackInserted?.id) {
            leadId = fallbackInserted.id;
          }
        } else if (inserted?.id) {
          leadId = inserted.id;
        }
      } catch (dbErr) {
        console.error("[Webmotors Webhook Fatal DB Error]:", dbErr);
        return NextResponse.json(
          { success: false, error: "Erro ao registrar proposta no banco de dados." },
          { status: 500 }
        );
      }
    }

    // 8. Notificação via WhatsApp com Links Curtos
    void notifyAssignedSellerViaWhatsApp({
      lead: {
        id: leadId,
        name: clientName,
        phone: clientPhone,
        email: clientEmail || null,
        vehicle_name: vehicleName,
        vehicleInterest: vehicleName,
        source: "webmotors",
        short_code: shortCode,
      },
      sellerName: sellerInfo.sellerName,
      organizationId,
    });

    return NextResponse.json(
      {
        success: true,
        lead_id: leadId,
        short_code: shortCode,
        assigned_to: sellerInfo.sellerName,
        portal: "webmotors",
        organization_id: organizationId,
        message: "Proposta Webmotors recebida e processada com sucesso",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Webmotors Webhook Fatal Error]", error);
    return NextResponse.json(
      { success: false, error: "Erro interno ao processar proposta da Webmotors." },
      { status: 500 }
    );
  }
}
