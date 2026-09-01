/**
 * @file route.ts
 * @description Endpoints de Gerenciamento e Emissão de Chaves de API para Integrações com Isolamento Multi-Tenant Estrito (GET e POST /api/v1/settings/api-keys).
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { getCurrentUserAndTenant, extractBearerToken } from "@/lib/auth/get-current-user";
import { memoryApiKeys } from "@/lib/services/api-key-service";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getScopedSupabaseClient } from "@/lib/supabase/authenticated-client";

/**
 * Schema Zod para validação do payload de criação de chave de API
 */
const createApiKeyBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "O nome da chave deve ter no mínimo 3 caracteres.")
    .max(100, "O nome da chave deve ter no máximo 100 caracteres."),
  expires_in_days: z
    .number()
    .int("O período de expiração em dias deve ser um número inteiro.")
    .positive("O período de expiração em dias deve ser positivo.")
    .nullable()
    .optional(),
});

/**
 * Helper para obter cliente Supabase adequado (Service Role administrativo ou repasse de token Bearer)
 */
function getSupabaseClientForApiKeys(token?: string | null) {
  return getScopedSupabaseClient(undefined, token);
}

/**
 * @swagger
 * /api/v1/settings/api-keys:
 *   get:
 *     summary: Lista as chaves de API e integrações do tenant autenticado
 *     description: Retorna as chaves de integração geradas para o tenant da concessionária autenticada (com os tokens brutos mascarados).
 *     tags:
 *       - Configurações
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de chaves recuperada com sucesso.
 *       401:
 *         description: Não autorizado (token ausente ou inválido).
 *       403:
 *         description: Proibido (usuário não pertence a nenhum tenant).
 *   post:
 *     summary: Criação de nova Chave de API criptográfica para o Tenant
 *     description: Gera uma nova chave de integração associada estritamente ao tenant_id e criada por created_by do usuário autenticado (requer perfil admin ou owner). Armazena o Hash SHA-256 no banco e devolve o token bruto em texto claro uma única vez.
 *     tags:
 *       - Configurações
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Integração Meta Ads"
 *               expires_in_days:
 *                 type: integer
 *                 example: 90
 *     responses:
 *       201:
 *         description: Chave de API gerada e vinculada ao tenant com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     api_key:
 *                       type: string
 *                       description: Copie esta chave agora; ela não será exibida novamente.
 *                       example: "acelera_live_00000000000000000000000000000000"
 *                     key_prefix:
 *                       type: string
 *                       example: "acelera_live_0000..."
 *                     tenant_id:
 *                       type: string
 *                     expires_at:
 *                       type: string
 *                       nullable: true
 *                     created_at:
 *                       type: string
 *       400:
 *         description: Dados de entrada inválidos.
 *       401:
 *         description: Token de autenticação não fornecido ou inválido.
 *       403:
 *         description: Usuário não vinculado a uma organização ou sem permissão.
 *       500:
 *         description: Erro ao criar chave de API.
 */

export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUserAndTenant(request);
    if (!auth.success) {
      return NextResponse.json(
        { error: "Token de autenticação não fornecido ou inválido." },
        { status: 401 }
      );
    }

    const { organizationId } = auth.context;
    const tenantId = organizationId;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Usuário não vinculado a uma organização ou sem permissão." },
        { status: 403 }
      );
    }

    if (isSupabaseServerConfigured()) {
      const supabase = await getScopedSupabaseClient(request);
      if (supabase) {
        const { data, error } = await supabase
          .from("api_keys")
          .select("id, organization_id, tenant_id, created_by, name, key_prefix, created_at, last_used_at, revoked_at, expires_at, status")
          .or(`organization_id.eq.${tenantId},tenant_id.eq.${tenantId}`)
          .order("created_at", { ascending: false });

        if (error) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("api_keys")
            .select("id, organization_id, name, key_prefix, created_at, last_used_at, revoked_at, expires_at")
            .eq("organization_id", tenantId)
            .order("created_at", { ascending: false });

          if (fallbackError) {
            console.error("[Get Api Keys Error]", fallbackError.message);
            return NextResponse.json({ error: "Erro ao consultar chaves." }, { status: 500 });
          }

          return NextResponse.json({ data: fallbackData || [] }, { status: 200 });
        }

        return NextResponse.json({ data: data || [] }, { status: 200 });
      }
    }

    const list = memoryApiKeys
      .filter((k) => k.organization_id === tenantId)
      .map(({ id, organization_id, name, key_prefix, created_at, last_used_at, revoked_at, expires_at }) => ({
        id,
        tenant_id: organization_id,
        organization_id,
        name,
        key_prefix,
        created_at,
        last_used_at,
        revoked_at,
        expires_at,
        status: revoked_at ? "revoked" : "active",
        is_active: !revoked_at,
      }));

    return NextResponse.json({ data: list }, { status: 200 });
  } catch (error) {
    console.error("[Get Api Keys Fatal]", error);
    return NextResponse.json({ error: "Erro interno ao listar chaves." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Autenticação e Extração de Tenant via JWT Bearer
    const auth = await getCurrentUserAndTenant(request);
    if (!auth.success) {
      return NextResponse.json(
        { error: "Token de autenticação não fornecido ou inválido." },
        { status: 401 }
      );
    }

    const { userId, role, organizationId } = auth.context;
    const tenantId = organizationId;

    // Validação estrita de Tenant ativo e Permissão administrativa (admin, owner, gerente)
    const isAllowedRole = role === "admin" || role === "owner" || role === "gerente";
    if (!tenantId || !isAllowedRole) {
      return NextResponse.json(
        { error: "Usuário não vinculado a uma organização ou sem permissão." },
        { status: 403 }
      );
    }

    // 2. Validação do Payload (Zod)
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Bad Request: JSON malformatado ou corpo da requisição ausente." },
        { status: 400 }
      );
    }

    const validation = createApiKeyBodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Dados inválidos.",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, expires_in_days } = validation.data;

    // 3. Geração Segura da Chave utilizando o módulo nativo crypto do Node.js
    const randomHex = crypto.randomBytes(24).toString("hex");
    const rawKey = `acelera_live_${randomHex}`;
    const keyPrefix = rawKey.slice(0, 16);
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    const now = new Date();
    const nowIso = now.toISOString();
    const expiresAt = expires_in_days
      ? new Date(now.getTime() + expires_in_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    let keyId = `key_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    // 4. Persistência no Banco (public.api_keys) com isolamento estrito de tenant
    const token = extractBearerToken(request);
    const supabase = await getSupabaseClientForApiKeys(token);

    if (supabase) {
      // Inserção com tenant_id, organization_id, created_by, key_hash e status
      const insertPayload = {
        tenant_id: tenantId,
        organization_id: tenantId,
        created_by: userId,
        name,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        status: "active",
        expires_at: expiresAt,
        created_at: nowIso,
      };

      const { data: inserted, error: insertError } = await supabase
        .from("api_keys")
        .insert(insertPayload)
        .select("id")
        .maybeSingle();

      if (insertError) {
        console.warn("[API Key Multi-Tenant Insert] Tentando fallback para schema legado:", insertError.message);

        const fallbackPayload = {
          organization_id: tenantId,
          name,
          key_prefix: keyPrefix,
          key_hash: keyHash,
          expires_at: expiresAt,
          created_at: nowIso,
        };

        const { data: fallbackInserted, error: fallbackError } = await supabase
          .from("api_keys")
          .insert(fallbackPayload)
          .select("id")
          .maybeSingle();

        if (fallbackError) {
          console.error("[API Keys Create Error]:", fallbackError);
          return NextResponse.json(
            {
              error: "Erro ao criar chave de API.",
              detail: fallbackError.message,
            },
            { status: 500 }
          );
        }

        if (fallbackInserted?.id) {
          keyId = fallbackInserted.id;
        }
      } else if (inserted?.id) {
        keyId = inserted.id;
      }
    }

    // Atualiza registro em memória para compatibilidade em ambientes sandbox / offline
    memoryApiKeys.unshift({
      id: keyId,
      organization_id: tenantId,
      name,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      created_at: nowIso,
      last_used_at: null,
      revoked_at: null,
      expires_at: expiresAt,
      is_active: true,
    });

    // 5. Resposta (201 Created) com token bruto retornado apenas nesta resposta inicial
    return NextResponse.json(
      {
        success: true,
        message: "Chave de API gerada com sucesso. Guarde-a em local seguro, pois ela não será exibida novamente.",
        data: {
          id: keyId,
          name,
          api_key: rawKey,
          key_prefix: keyPrefix,
          tenant_id: tenantId,
          expires_at: expiresAt,
          created_at: nowIso,
        },
        // Propriedades compatíveis na raiz para integrações existentes
        id: keyId,
        tenant_id: tenantId,
        created_by: userId,
        name,
        key_prefix: keyPrefix,
        raw_key: rawKey,
        status: "active",
        expires_at: expiresAt,
        created_at: nowIso,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[API Keys Create Error]:", err);
    return NextResponse.json(
      {
        error: "Erro ao criar chave de API.",
        detail: err?.message || "Erro interno no servidor ao processar criação de chave.",
      },
      { status: 500 }
    );
  }
}
