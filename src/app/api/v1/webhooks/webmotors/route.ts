/**
 * @file route.ts
 * @description Endpoint de Ingestão de Propostas e Leads do Portal Webmotors (POST /api/v1/webhooks/webmotors).
 */

import { NextRequest, NextResponse } from "next/server";
import { validateApiKeyHeader } from "@/lib/auth/validate-api-key";
import { webmotorsLeadSchema } from "@/lib/validations/webhook";
import {
  resolveAssignedSellerInfo,
  notifyAssignedSellerViaWhatsApp,
} from "@/lib/crm/roleta";
import { generateShortCode } from "@/lib/utils/nanoid";
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
    // 1. Validação de Autenticação da Chave de API
    const authResult = await validateApiKeyHeader(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { organizationId } = authResult.context;

    // 2. Validação do Payload Zod Webmotors
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Bad Request: JSON malformatado." },
        { status: 400 }
      );
    }

    const validation = webmotorsLeadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados de proposta Webmotors inválidos.",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // 3. Normalização e Mapeamento dos Dados do Veículo e da Proposta
    const vehicleParts: string[] = [];
    if (data.veiculo?.marca) vehicleParts.push(data.veiculo.marca);
    if (data.veiculo?.modelo) vehicleParts.push(data.veiculo.modelo);
    if (data.veiculo?.versao) vehicleParts.push(data.veiculo.versao);
    if (data.veiculo?.anoModelo) vehicleParts.push(String(data.veiculo.anoModelo));

    const vehicleInterest =
      vehicleParts.length > 0 ? vehicleParts.join(" ") : "Interesse Webmotors";

    const noteParts: string[] = [];
    if (data.leadId) noteParts.push(`[Webmotors ID: ${data.leadId}]`);
    if (data.proposta?.valor) noteParts.push(`Proposta: R$ ${data.proposta.valor.toLocaleString("pt-BR")}`);
    if (data.proposta?.mensagem) noteParts.push(`Mensagem: "${data.proposta.mensagem}"`);
    if (data.proposta?.possuiTroca) {
      noteParts.push(`Troca: Sim${data.proposta.veiculoTroca ? ` (${data.proposta.veiculoTroca})` : ""}`);
    }

    const notes = noteParts.length > 0 ? noteParts.join(" | ") : "Lead Webmotors";
    const nowIso = new Date().toISOString();
    const initialStatus: LeadStatus = "novo";

    // 4. Distribuição por Roleta Comercial com fallback
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

    // 5. Persistência no Supabase com createAdminClient
    if (isSupabaseServerConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const adminSupabase = createAdminClient();
        const { data: inserted, error: insertError } = await adminSupabase
          .from("leads")
          .insert({
            organization_id: organizationId,
            tenant_id: organizationId,
            name: data.nome,
            phone: data.telefone,
            email: data.email || null,
            vehicle_interest: vehicleInterest,
            status: initialStatus,
            origin: "webmotors",
            seller_name: sellerInfo.sellerName,
            seller_id: sellerInfo.sellerId,
            notes,
            short_code: shortCode,
            last_contact_at: nowIso,
            created_at: nowIso,
          })
          .select("id")
          .maybeSingle();

        if (insertError) {
          console.warn("[Webmotors Webhook DB Insert Fallback]:", insertError.message);
          const { data: fallbackInserted, error: fallbackError } = await adminSupabase
            .from("leads")
            .insert({
              organization_id: organizationId,
              name: data.nome,
              phone: data.telefone,
              email: data.email || null,
              vehicle_interest: vehicleInterest,
              status: initialStatus,
              origin: "webmotors",
              seller_name: sellerInfo.sellerName,
              seller_id: sellerInfo.sellerId,
              notes,
              short_code: shortCode,
              last_contact_at: nowIso,
              created_at: nowIso,
            })
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

    // 6. Notificação via WhatsApp
    void notifyAssignedSellerViaWhatsApp({
      lead: {
        id: leadId,
        name: data.nome,
        phone: data.telefone,
        email: data.email || null,
        vehicleInterest,
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
        assigned_to: sellerInfo.sellerName,
        portal: "webmotors",
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
