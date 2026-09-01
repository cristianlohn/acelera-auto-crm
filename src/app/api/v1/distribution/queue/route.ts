/**
 * @file route.ts
 * @description Endpoint de Consulta da Fila e Regras da Roleta Comercial (GET /api/v1/distribution/queue).
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAndTenant } from "@/lib/auth/get-current-user";
import { getTeamMembersAction } from "@/app/actions/team-actions";

/**
 * @swagger
 * /api/v1/distribution/queue:
 *   get:
 *     summary: Consulta da fila ativa de vendedores e status do plantão da roleta
 *     description: Retorna a lista ordenada de consultores comerciais da concessionária que estão elegíveis e ativos no plantão da Roleta Comercial (in_roulette = true).
 *     tags:
 *       - Distribuição & Roleta
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Fila de distribuição retornada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_sellers:
 *                   type: integer
 *                 active_in_roulette:
 *                   type: integer
 *                 queue:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       role:
 *                         type: string
 *                       segment:
 *                         type: string
 *                       in_roulette:
 *                         type: boolean
 *       401:
 *         description: Não autorizado.
 *       500:
 *         description: Erro interno no servidor.
 */
export async function GET(request: NextRequest) {
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

    const members = await getTeamMembersAction(organizationId);

    const activeInRoulette = members.filter(
      (m) => m.in_roulette && m.status === "active" && m.role !== "manager"
    );

    return NextResponse.json(
      {
        total_sellers: members.length,
        active_in_roulette: activeInRoulette.length,
        queue: members.map((m, index) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          role: m.role,
          segment: m.segment,
          in_roulette: m.in_roulette,
          status: m.status,
          queue_priority: index + 1,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Distribution Queue Error]", error);
    return NextResponse.json(
      { error: "Erro interno ao consultar a fila da roleta." },
      { status: 500 }
    );
  }
}
