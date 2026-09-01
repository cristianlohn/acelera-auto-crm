/**
 * @file route.ts
 * @description Endpoint de Revogação de Chave de API com Isolamento Multi-Tenant (DELETE /api/v1/settings/api-keys/[id]).
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAndTenant } from "@/lib/auth/get-current-user";
import {
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { getScopedSupabaseClient } from "@/lib/supabase/authenticated-client";
import { memoryApiKeys } from "@/lib/services/api-key-service";

/**
 * @swagger
 * /api/v1/settings/api-keys/{id}:
 *   delete:
 *     summary: Revogação de Chave de API do Tenant
 *     description: Inativa e revoga imediatamente uma Chave de API da concessionária, bloqueando novos acessos via Webhook ou REST.
 *     tags:
 *       - Configurações
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "00000000-0000-0000-0000-000000000000"
 *         description: ID da chave de API a ser revogada.
 *     responses:
 *       200:
 *         description: Chave revogada com sucesso.
 *       401:
 *         description: Não autorizado.
 *       403:
 *         description: Proibido (usuário sem tenant).
 *       404:
 *         description: Chave não encontrada para este tenant.
 *       500:
 *         description: Erro interno no servidor.
 */
export async function DELETE(
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
    const tenantId = organizationId;

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Usuário autenticado não pertence a nenhum tenant/organização." },
        { status: 403 }
      );
    }

    const nowIso = new Date().toISOString();

    if (isSupabaseServerConfigured()) {
      const supabase = await getScopedSupabaseClient(request);
      if (supabase) {
        // Tenta atualizar com status revoked e revoked_at
        const { data, error } = await supabase
          .from("api_keys")
          .update({ revoked_at: nowIso, status: "revoked" })
          .eq("id", id)
          .or(`organization_id.eq.${tenantId},tenant_id.eq.${tenantId}`)
          .select("id")
          .maybeSingle();

        if (error) {
          // Fallback caso status ou .or() não seja suportado pelo schema legado
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("api_keys")
            .update({ revoked_at: nowIso })
            .eq("id", id)
            .eq("organization_id", tenantId)
            .select("id")
            .maybeSingle();

          if (fallbackError) {
            console.error("[Revoke Api Key Fallback Error]", fallbackError.message);
            return NextResponse.json({ error: "Erro ao revogar chave no banco." }, { status: 500 });
          }

          if (!fallbackData) {
            return NextResponse.json({ error: "Chave não encontrada para a sua organização." }, { status: 404 });
          }

          return NextResponse.json(
            { success: true, message: "Chave de API revogada com sucesso." },
            { status: 200 }
          );
        }

        if (!data) {
          return NextResponse.json({ error: "Chave não encontrada para a sua organização." }, { status: 404 });
        }

        return NextResponse.json(
          { success: true, message: "Chave de API revogada com sucesso." },
          { status: 200 }
        );
      }
    }

    const memKey = memoryApiKeys.find(
      (k) => k.id === id && (k.organization_id === tenantId || (k as unknown as { tenant_id?: string }).tenant_id === tenantId)
    );
    if (!memKey) {
      return NextResponse.json({ error: "Chave não encontrada." }, { status: 404 });
    }

    memKey.revoked_at = nowIso;
    memKey.is_active = false;

    return NextResponse.json(
      { success: true, message: "Chave de API revogada com sucesso." },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Revoke Api Key Fatal]", error);
    return NextResponse.json({ error: "Erro interno no servidor ao revogar chave." }, { status: 500 });
  }
}
