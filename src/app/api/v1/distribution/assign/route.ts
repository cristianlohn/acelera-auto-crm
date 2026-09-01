/**
 * @file route.ts
 * @description Endpoint de Atribuição Manual ou Reprocessamento por Roleta (POST /api/v1/distribution/assign).
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAndTenant } from "@/lib/auth/get-current-user";
import { manualAssignSchema } from "@/lib/validations/crm";
import {
  resolveAssignedSellerInfo,
  notifyAssignedSellerViaWhatsApp,
} from "@/lib/crm/roleta";
import {
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { getScopedSupabaseClient } from "@/lib/supabase/authenticated-client";

/**
 * @swagger
 * /api/v1/distribution/assign:
 *   post:
 *     summary: Atribuição manual ou redistribuição de lead por roleta
 *     description: Permite ao gestor transferir a responsabilidade de um lead para um consultor específico ou acionar o motor de Roleta Comercial para redistribuição automática.
 *     tags:
 *       - Distribuição & Roleta
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lead_id
 *             properties:
 *               lead_id:
 *                 type: string
 *                 example: "00000000-0000-0000-0000-000000000000"
 *               seller_id:
 *                 type: string
 *                 example: "00000000-0000-0000-0000-000000000000"
 *               seller_name:
 *                 type: string
 *                 example: "Rafael Alves"
 *               trigger_roleta:
 *                 type: boolean
 *                 default: false
 *                 description: Se verdadeiro, ignora o vendedor fornecido e calcula o próximo da fila.
 *     responses:
 *       200:
 *         description: Lead atribuído com sucesso.
 *       400:
 *         description: Parâmetros de atribuição inválidos.
 *       401:
 *         description: Não autorizado.
 *       404:
 *         description: Lead não encontrado.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getCurrentUserAndTenant(request);
    if (!auth.success) {
      return auth.response;
    }

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

    const validation = manualAssignSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { lead_id, seller_name, trigger_roleta } = validation.data;

    const sellerInfo = await resolveAssignedSellerInfo(
      trigger_roleta ? null : seller_name,
      organizationId
    );

    if (isSupabaseServerConfigured()) {
      const supabase = await getScopedSupabaseClient(request);
      if (supabase) {
        const { data: updated, error } = await supabase
          .from("leads")
          .update({
            seller_name: sellerInfo.sellerName,
            seller_id: sellerInfo.sellerId || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", lead_id)
          .eq("organization_id", organizationId)
          .select("*")
          .maybeSingle();

        if (error) {
          console.error("[Assign Route Error]", error.message);
          return NextResponse.json({ error: "Erro ao atualizar atribuição no banco." }, { status: 500 });
        }

        if (!updated) {
          return NextResponse.json({ error: "Lead não encontrado para a sua organização." }, { status: 404 });
        }

        // Notificação WhatsApp
        void notifyAssignedSellerViaWhatsApp({
          lead: {
            id: updated.id,
            name: updated.name,
            phone: updated.phone,
            email: updated.email,
            vehicleInterest: updated.vehicle_interest,
            source: updated.origin,
          },
          sellerName: sellerInfo.sellerName,
          organizationId,
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        lead_id,
        assigned_seller: {
          id: sellerInfo.sellerId || null,
          name: sellerInfo.sellerName,
        },
        message: "Lead atribuído com sucesso.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Assign Route Fatal]", error);
    return NextResponse.json({ error: "Erro interno no servidor ao processar atribuição." }, { status: 500 });
  }
}
