/**
 * @file route.ts
 * @description Endpoint de Consulta e Atualização de Lead Individual (GET e PATCH /api/v1/leads/[id]).
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAndTenant } from "@/lib/auth/get-current-user";
import { updateCrmLeadSchema } from "@/lib/validations/crm";
import { normalizeOrigin } from "@/app/api/webhooks/leads/route";
import {
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { getScopedSupabaseClient } from "@/lib/supabase/authenticated-client";
import { mockLeads } from "@/lib/mock-data";
import type { Database, LeadStatus } from "@/types/database.types";

/**
 * @swagger
 * /api/v1/leads/{id}:
 *   get:
 *     summary: Consulta de lead por ID
 *     description: Recupera os detalhes completos de um lead específico da concessionária autenticada.
 *     tags:
 *       - Leads
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "00000000-0000-0000-0000-000000000000"
 *         description: Identificador único do lead.
 *     responses:
 *       200:
 *         description: Lead encontrado.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Lead não encontrado ou não pertence à organização.
 *   patch:
 *     summary: Atualização cadastral e movimentação de funil do lead
 *     description: Atualiza os dados cadastrais, move a etapa do funil Kanban ou altera o vendedor responsável pelo lead.
 *     tags:
 *       - Leads
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "00000000-0000-0000-0000-000000000000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               vehicle_interest:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [novo, atendimento, visita, proposta, fechado]
 *               seller_name:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lead atualizado com sucesso.
 *       400:
 *         description: Dados de atualização inválidos.
 *       404:
 *         description: Lead não encontrado.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCurrentUserAndTenant(request);
    if (!auth.success) {
      return auth.response;
    }

    const { id } = await params;
    const { organizationId } = auth.context;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Forbidden: Usuário autenticado não pertence a nenhum tenant/organização." },
        { status: 403 }
      );
    }

    if (isSupabaseServerConfigured()) {
      const supabase = await getScopedSupabaseClient(request);
      if (supabase) {
        const { data, error } = await supabase
          .from("leads")
          .select("*")
          .eq("id", id)
          .eq("organization_id", organizationId)
          .maybeSingle();

        if (error) {
          console.error("[Get Lead By ID Error]", error.message);
          return NextResponse.json({ error: "Erro ao consultar o lead." }, { status: 500 });
        }

        if (!data) {
          return NextResponse.json({ error: "Lead não encontrado ou não pertence à sua concessionária." }, { status: 404 });
        }

        return NextResponse.json({ data }, { status: 200 });
      }
    }

    const found = mockLeads.find((l) => l.id === id);
    if (!found) {
      return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ data: found }, { status: 200 });
  } catch (error) {
    console.error("[Get Lead Fatal]", error);
    return NextResponse.json({ error: "Erro interno ao processar a consulta." }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCurrentUserAndTenant(request);
    if (!auth.success) {
      return auth.response;
    }

    const { id } = await params;
    const { organizationId } = auth.context;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Forbidden: Usuário autenticado não pertence a nenhum tenant/organização." },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Bad Request: JSON malformatado." }, { status: 400 });
    }

    const validation = updateCrmLeadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos para atualização.", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const payload = validation.data;
    const updateFields: Database["public"]["Tables"]["leads"]["Update"] = {
      updated_at: new Date().toISOString(),
    };

    if (payload.name) updateFields.name = payload.name;
    if (payload.phone) updateFields.phone = payload.phone;
    if (payload.email !== undefined) updateFields.email = payload.email || null;
    if (payload.vehicle_interest) updateFields.vehicle_interest = payload.vehicle_interest;
    if (payload.status) updateFields.status = payload.status as LeadStatus;
    if (payload.origin) updateFields.origin = normalizeOrigin(payload.origin);
    if (payload.seller_name) updateFields.seller_name = payload.seller_name;
    if (payload.seller_id) updateFields.seller_id = payload.seller_id;
    if (payload.notes !== undefined) updateFields.notes = payload.notes || null;

    if (isSupabaseServerConfigured()) {
      const supabase = await getScopedSupabaseClient(request);
      if (supabase) {
        const { data, error } = await supabase
          .from("leads")
          .update(updateFields)
          .eq("id", id)
          .eq("organization_id", organizationId)
          .select("*")
          .maybeSingle();

        if (error) {
          console.error("[Update Lead Error]", error.message);
          return NextResponse.json({ error: "Erro ao atualizar lead no banco de dados." }, { status: 500 });
        }

        if (!data) {
          return NextResponse.json({ error: "Lead não encontrado para atualização." }, { status: 404 });
        }

        return NextResponse.json({ success: true, data, message: "Lead atualizado com sucesso" }, { status: 200 });
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: { id, ...updateFields },
        message: "Lead atualizado com sucesso",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Update Lead Fatal]", error);
    return NextResponse.json({ error: "Erro interno no servidor ao atualizar lead." }, { status: 500 });
  }
}
