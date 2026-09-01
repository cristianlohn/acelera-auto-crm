/**
 * @file validate-api-key.ts
 * @description Helper server-side para extração e validação de chaves de API em Route Handlers.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, type ApiKeyValidationResult } from "@/lib/services/api-key-service";

export interface ValidatedTenantContext {
  organizationId: string;
  keyId?: string;
  name?: string;
}

export type ApiKeyHeaderValidation =
  | { success: true; context: ValidatedTenantContext }
  | { success: false; error: string; response: NextResponse };

/**
 * Extrai a chave de API dos cabeçalhos da requisição HTTP (`x-api-key` ou `Authorization: Bearer`).
 */
export function extractApiKeyFromRequest(request: NextRequest): string | null {
  const xApiKey = request.headers.get("x-api-key");
  if (xApiKey && xApiKey.trim()) {
    return xApiKey.trim();
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer" && parts[1].trim()) {
      return parts[1].trim();
    }
  }

  return null;
}

/**
 * Valida a chave de API fornecida no cabeçalho e retorna o contexto multi-tenant do cliente.
 * Caso seja inválida, retorna uma resposta HTTP 401 padronizada.
 */
export async function validateApiKeyHeader(
  request: NextRequest
): Promise<ApiKeyHeaderValidation> {
  const apiKey = extractApiKeyFromRequest(request);

  if (!apiKey) {
    return {
      success: false,
      error: "Chave de API não fornecida no cabeçalho (x-api-key ou Authorization: Bearer).",
      response: NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Chave de API não fornecida no cabeçalho (x-api-key ou Authorization: Bearer).",
        },
        { status: 401 }
      ),
    };
  }

  const validation: ApiKeyValidationResult = await validateApiKey(apiKey);

  if (!validation.valid || !validation.organizationId) {
    return {
      success: false,
      error: validation.error || "Chave de API inválida, expirada ou revogada.",
      response: NextResponse.json(
        {
          success: false,
          error: `Unauthorized: ${validation.error || "Chave de API inválida, expirada ou revogada."}`,
        },
        { status: 401 }
      ),
    };
  }

  return {
    success: true,
    context: {
      organizationId: validation.organizationId,
      keyId: validation.keyId,
      name: validation.name,
    },
  };
}
