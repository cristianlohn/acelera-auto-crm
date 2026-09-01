/**
 * @file route.ts
 * @description Endpoint de Ingestão de Leads via Webhook com Autenticação Criptográfica x-api-key e Isolamento Multi-Tenant (POST /api/v1/webhooks/leads).
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { normalizeOrigin } from "@/app/api/webhooks/leads/route";
import {
  resolveAssignedSellerInfo,
  notifyAssignedSellerViaWhatsApp,
} from "@/lib/crm/roleta";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import {
  VALID_STATIC_API_KEYS,
  memoryApiKeys,
} from "@/lib/services/api-key-service";
import { DEFAULT_DEMO_ORG_ID } from "@/lib/auth/tenant";
import type { LeadStatus, Database } from "@/types/database.types";

/**
 * Schema Zod para validação e sanitização estrita do payload de lead
 */
const webhookLeadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "O nome não pode ser vazio."),
  phone: z
    .string()
    .transform((val) => val.replace(/\D/g, ""))
    .refine((val) => val.length >= 8 && val.length <= 15, {
      message: "O telefone deve conter entre 8 e 15 dígitos numéricos.",
    }),
  email: z
    .string()
    .trim()
    .email("Formato de e-mail inválido.")
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  origin: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() ? val.trim() : "landing_page")),
  vehicle_interest: z.string().trim().nullable().optional(),
  seller_name: z.string().trim().nullable().optional(),
  seller_id: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  custom_fields: z.record(z.string(), z.unknown()).nullable().optional(),
});

type ApiKeyAuthResult =
  | {
      authenticated: true;
      tenantId: string;
      keyId: string;
      keyName: string;
      response?: null;
    }
  | {
      authenticated: false;
      response: NextResponse;
      tenantId?: null;
      keyId?: null;
      keyName?: null;
    };

/**
 * Helper para autenticação segura via x-api-key com hash SHA-256 e extração do tenant_id
 */
async function authenticateApiKeyHeader(request: NextRequest): Promise<ApiKeyAuthResult> {
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey || !apiKey.trim()) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { success: false, error: "Chave de API não fornecida no cabeçalho x-api-key." },
        { status: 401 }
      ),
    };
  }

  const rawKey = apiKey.trim();
  const calculatedHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  // 1. Suporte a chaves estáticas de teste / CI (ambiente de testes automatizados)
  const isTestEnvironment =
    process.env.NODE_ENV === "test" ||
    process.env.VITEST === "true" ||
    process.env.PLAYWRIGHT_TEST === "true";

  if (isTestEnvironment && VALID_STATIC_API_KEYS.has(rawKey)) {
    return {
      authenticated: true,
      tenantId: DEFAULT_DEMO_ORG_ID,
      keyId: "test-static-key",
      keyName: "Chave de Teste",
    };
  }

  // 2. Consulta no Supabase via createAdminClient para autenticação resiliente de webhook
  if (isSupabaseServerConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const adminSupabase = createAdminClient();
      const { data, error } = await adminSupabase
        .from("api_keys")
        .select("id, organization_id, tenant_id, name, revoked_at, expires_at, status")
        .eq("key_hash", calculatedHash)
        .maybeSingle();

      if (!error && data) {
        const isRevoked = Boolean(data.revoked_at) || (data.status && data.status !== "active");
        const isExpired = data.expires_at
          ? new Date(data.expires_at).getTime() < Date.now()
          : false;

        if (isRevoked || isExpired) {
          return {
            authenticated: false,
            response: NextResponse.json(
              { success: false, error: "Chave de API inválida ou revogada." },
              { status: 401 }
            ),
          };
        }

        const tenantId = (data.tenant_id || data.organization_id) as string;

        // Atualização não-bloqueante de last_used_at
        void adminSupabase
          .from("api_keys")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", data.id);

        return {
          authenticated: true,
          tenantId,
          keyId: data.id,
          keyName: data.name,
        };
      }
    } catch (dbError) {
      console.error("[API Key Auth Error in Database]:", dbError);
    }
  }

  // 3. Fallback no repositório em memória (para modo sandbox / mock de testes)
  const memoryKey = memoryApiKeys.find(
    (k) => k.key_hash === calculatedHash || k.id === rawKey
  );

  if (memoryKey) {
    const isRevoked = Boolean(memoryKey.revoked_at) || !memoryKey.is_active;
    const isExpired = memoryKey.expires_at
      ? new Date(memoryKey.expires_at).getTime() < Date.now()
      : false;

    if (isRevoked || isExpired) {
      return {
        authenticated: false,
        response: NextResponse.json(
          { success: false, error: "Chave de API inválida ou revogada." },
          { status: 401 }
        ),
      };
    }

    memoryKey.last_used_at = new Date().toISOString();
    return {
      authenticated: true,
      tenantId: memoryKey.organization_id,
      keyId: memoryKey.id,
      keyName: memoryKey.name,
    };
  }

  return {
    authenticated: false,
    response: NextResponse.json(
      { success: false, error: "Chave de API inválida ou revogada." },
      { status: 401 }
    ),
  };
}

/**
 * @swagger
 * /api/v1/webhooks/leads:
 *   post:
 *     summary: Ingestão de leads via Webhook com x-api-key
 *     description: Recebe leads externos de plataformas parceiras, landing pages e integrações via cabeçalho x-api-key validado por hash SHA-256. Atribui vendedor via roleta comercial e persiste com isolamento estrito por tenant_id.
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
 *               - name
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *                 example: Carlos Eduardo Silva
 *               phone:
 *                 type: string
 *                 example: "11987654321"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: carlos.silva@email.com
 *               vehicle_interest:
 *                 type: string
 *                 example: Jeep Compass Longitude 2024
 *               origin:
 *                 type: string
 *                 example: landing_page
 *               seller_name:
 *                 type: string
 *                 description: Nome do vendedor para atribuição explícita (ignora a roleta se informado).
 *               notes:
 *                 type: string
 *                 example: Cliente solicitou contato urgente no WhatsApp.
 *               custom_fields:
 *                 type: object
 *     responses:
 *       201:
 *         description: Lead registrado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Lead registrado com sucesso.
 *                 lead_id:
 *                   type: string
 *                   example: "00000000-0000-0000-0000-000000000000"
 *                 tenant_id:
 *                   type: string
 *                   example: "00000000-0000-0000-0000-000000000000"
 *                 status:
 *                   type: string
 *                   example: received
 *                 assigned_to:
 *                   type: string
 *                   example: "Rafael Alves"
 *       400:
 *         description: Dados do lead inválidos ou incompletos.
 *       401:
 *         description: Chave de API inválida ou revogada.
 *       500:
 *         description: Erro interno no processamento.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Autenticação via x-api-key com Hash SHA-256 e extração do tenant
    const authResult = await authenticateApiKeyHeader(request);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { tenantId } = authResult;

    // 2. Leitura e Validação do Corpo da Requisição (Zod)
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Bad Request: JSON malformatado ou corpo da requisição ausente.",
        },
        { status: 400 }
      );
    }

    const validation = webhookLeadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados do lead inválidos.",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;
    const normalizedOrigin = normalizeOrigin(data.origin);
    const vehicleInterest = data.vehicle_interest || "Interesse Geral";
    const nowIso = new Date().toISOString();
    const initialStatus: LeadStatus = "novo";

    // 3. Distribuição Inteligente por Roleta Comercial com fallback gracioso
    // Sanitização estrita: se seller_id ou seller_name for "string", "null", "" ou indefinido, força undefined
    const sanitizeSellerParam = (val?: unknown): string | undefined => {
      if (typeof val !== "string") return undefined;
      const trimmed = val.trim();
      if (!trimmed) return undefined;
      const lower = trimmed.toLowerCase();
      if (lower === "string" || lower === "null" || lower === "undefined" || lower === "none") {
        return undefined;
      }
      return trimmed;
    };

    const bodyRecord = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const cleanSellerId = sanitizeSellerParam(bodyRecord.seller_id ?? data.seller_id);
    const cleanSellerName = sanitizeSellerParam(bodyRecord.seller_name ?? data.seller_name);

    let sellerInfo: {
      sellerId: string | null;
      sellerName: string;
      sellerPhone: string | null;
    } = {
      sellerId: null,
      sellerName: "Não atribuído",
      sellerPhone: null,
    };

    try {
      const resolved = await resolveAssignedSellerInfo(cleanSellerId || cleanSellerName, tenantId);
      sellerInfo = {
        sellerId: resolved.sellerId ?? null,
        sellerName: resolved.sellerName,
        sellerPhone: resolved.sellerPhone ?? null,
      };
    } catch (roletaError) {
      console.warn(
        "[Roleta Distribution Warning]: Vendedor não atribuído pelo plantão, gravando lead na fila geral.",
        roletaError
      );
      sellerInfo = { sellerId: null, sellerName: "Fila Geral", sellerPhone: null };
    }

    let leadId = `lead_gen_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    // 4. Persistência Relacional Segura no Supabase (createAdminClient) vinculada ao Tenant
    if (isSupabaseServerConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const adminSupabase = createAdminClient();

        const insertPayload: Record<string, unknown> = {
          tenant_id: tenantId,
          organization_id: tenantId,
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          origin: normalizedOrigin,
          vehicle_interest: vehicleInterest,
          status: initialStatus,
          seller_id: sellerInfo.sellerId || null,
          seller_name: sellerInfo.sellerName,
          notes: data.notes || null,
          last_contact_at: nowIso,
          created_at: nowIso,
        };

        if (data.custom_fields) {
          insertPayload.custom_fields = data.custom_fields;
        }

        const { data: inserted, error: insertError } = await adminSupabase
          .from("leads")
          .insert(insertPayload as never)
          .select("id")
          .maybeSingle();

        if (insertError) {
          console.warn("[Webhook Lead Insert] Tentando fallback para schema legado:", insertError.message);

          const fallbackPayload = {
            organization_id: tenantId,
            name: data.name,
            phone: data.phone,
            email: data.email || null,
            origin: normalizedOrigin as Database["public"]["Enums"]["lead_origin"],
            vehicle_interest: vehicleInterest,
            status: initialStatus,
            seller_id: sellerInfo.sellerId || null,
            seller_name: sellerInfo.sellerName,
            notes: data.notes || null,
            last_contact_at: nowIso,
            created_at: nowIso,
          };

          const { data: fallbackInserted, error: fallbackError } = await adminSupabase
            .from("leads")
            .insert(fallbackPayload)
            .select("id")
            .maybeSingle();

          if (fallbackError) {
            console.error("[Generic Webhook Ingestion Error]:", fallbackError.message);
            return NextResponse.json(
              { success: false, error: "Erro ao registrar o lead no banco de dados." },
              { status: 500 }
            );
          }

          if (fallbackInserted?.id) {
            leadId = fallbackInserted.id;
          }
        } else if (inserted?.id) {
          leadId = inserted.id;
        }
      } catch (dbError) {
        console.error("[Database Connection Error on Lead Ingestion]:", dbError);
        return NextResponse.json(
          { success: false, error: "Erro ao registrar o lead no banco de dados." },
          { status: 500 }
        );
      }
    }

    // 5. Notificação Não-Bloqueante via WhatsApp para o Vendedor Atribuído
    if (sellerInfo.sellerName && sellerInfo.sellerName !== "Fila Geral" && sellerInfo.sellerName !== "Não atribuído") {
      void notifyAssignedSellerViaWhatsApp({
        lead: {
          id: leadId,
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          vehicleInterest,
          source: normalizedOrigin,
        },
        sellerName: sellerInfo.sellerName,
        sellerPhone: sellerInfo.sellerPhone,
        organizationId: tenantId,
      });
    }

    // 6. Resposta Padronizada (201 Created)
    return NextResponse.json(
      {
        success: true,
        message: "Lead registrado com sucesso.",
        lead_id: leadId,
        tenant_id: tenantId,
        status: "received",
        assigned_to: sellerInfo.sellerName,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Webhook Ingestion Fatal Error]", error);
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor ao processar o webhook." },
      { status: 500 }
    );
  }
}
