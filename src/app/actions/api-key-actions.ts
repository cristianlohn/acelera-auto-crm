/**
 * @file api-key-actions.ts
 * @description Server Actions para gerenciamento de Chaves de API e Integrações Externas.
 *
 * Funcionalidades:
 * - `getApiKeysAction`: Consulta segura de chaves do tenant.
 * - `createApiKeyAction`: Geração criptográfica, persistência e revelação única da rawKey.
 * - `revokeApiKeyAction`: Revogação imediata de credenciais de integração.
 */

"use server";

import { revalidatePath } from "next/cache";
import { resolveUserTenantContext, DEFAULT_DEMO_ORG_ID } from "@/lib/auth/tenant";
import {
  createServerSupabaseClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { createApiKeySchema } from "@/lib/validations/api-key";
import {
  generateApiKey,
  memoryApiKeys,
} from "@/lib/services/api-key-service";
import type { ApiKey, CreateApiKeyResult } from "@/types/api-key";

/**
 * Consulta todas as chaves de API pertencentes à organização do usuário autenticado.
 */
export async function getApiKeysAction(organizationId?: string): Promise<ApiKey[]> {
  const tenantContext = await resolveUserTenantContext();
  const orgId = organizationId || tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

  if (isSupabaseServerConfigured() && !tenantContext.isDemo && tenantContext.organizationId) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        return data.map((row) => ({
          id: row.id,
          organization_id: row.organization_id,
          name: row.name,
          key_prefix: row.key_prefix,
          key_hash: row.key_hash,
          created_at: row.created_at,
          last_used_at: row.last_used_at,
          revoked_at: row.revoked_at,
          expires_at: row.expires_at,
          is_active: !row.revoked_at,
        }));
      }
    } catch {
      // Fallback
    }
  }

  // Retorna do registro em memória
  return memoryApiKeys
    .filter((k) => k.organization_id === orgId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Cria uma nova chave de API com geração criptográfica do token e persistência do Hash SHA-256.
 * Retorna a chave completa (rawKey) para exibição única no cliente.
 */
export async function createApiKeyAction(
  formDataOrPayload: unknown
): Promise<CreateApiKeyResult> {
  const tenantContext = await resolveUserTenantContext();
  const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

  let rawPayload: unknown = formDataOrPayload;
  if (formDataOrPayload instanceof FormData) {
    rawPayload = {
      name: formDataOrPayload.get("name"),
      expires_in_days: formDataOrPayload.get("expires_in_days")
        ? Number(formDataOrPayload.get("expires_in_days"))
        : undefined,
    };
  }

  const parseResult = createApiKeySchema.safeParse(rawPayload);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || "Dados inválidos para geração de chave.",
    };
  }

  const { name, expires_in_days } = parseResult.data;
  const { rawKey, keyHash, keyPrefix } = generateApiKey("live");

  const expiresAt = expires_in_days
    ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const newKey: ApiKey = {
    id: `key_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    organization_id: orgId,
    name,
    key_prefix: keyPrefix,
    key_hash: keyHash,
    created_at: new Date().toISOString(),
    last_used_at: null,
    revoked_at: null,
    expires_at: expiresAt,
    is_active: true,
  };

  // Persiste no Supabase se configurado
  if (isSupabaseServerConfigured() && !tenantContext.isDemo && tenantContext.organizationId) {
    try {
      const supabase = await createServerSupabaseClient();
      await supabase.from("api_keys").insert({
        id: newKey.id,
        organization_id: orgId,
        name: newKey.name,
        key_prefix: newKey.key_prefix,
        key_hash: newKey.key_hash,
        expires_at: newKey.expires_at,
      });
    } catch {
      // Fallback
    }
  }

  // Persiste na memória para atualização imediata na interface
  memoryApiKeys.unshift(newKey);

  try {
    revalidatePath("/dashboard/settings/integrations");
    revalidatePath("/dashboard/settings/api-keys");
    revalidatePath("/settings");
  } catch {
    // Revalidação silenciosa em testes
  }

  return {
    success: true,
    rawKey,
    keyPrefix,
    name: newKey.name,
    key: newKey,
  };
}

/**
 * Revoga uma chave de API existente, invalidando seu uso imediatamente.
 */
export async function revokeApiKeyAction(
  keyId: string
): Promise<{ success: boolean; error?: string }> {
  const tenantContext = await resolveUserTenantContext();
  const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

  const targetKey = memoryApiKeys.find(
    (k) => k.id === keyId && k.organization_id === orgId
  );

  if (targetKey) {
    targetKey.revoked_at = new Date().toISOString();
    targetKey.is_active = false;
  }

  if (isSupabaseServerConfigured() && !tenantContext.isDemo && tenantContext.organizationId) {
    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase
        .from("api_keys")
        .update({
          revoked_at: new Date().toISOString(),
        })
        .eq("id", keyId)
        .eq("organization_id", orgId);

      if (error) {
        return { success: false, error: error.message };
      }
    } catch {
      // Fallback
    }
  }

  try {
    revalidatePath("/dashboard/settings/integrations");
    revalidatePath("/dashboard/settings/api-keys");
    revalidatePath("/settings");
  } catch {
    // Revalidação silenciosa em testes
  }

  return { success: true };
}
