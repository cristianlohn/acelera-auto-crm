/**
 * @file api-key-service.ts
 * @description Serviço de Criptografia, Geração Segura e Validação de Chaves de API.
 *
 * Princípios de Segurança:
 * - A chave bruta (rawKey) é gerada via entropia criptográfica (crypto.randomBytes).
 * - Apenas o Hash SHA-256 é armazenado no banco de dados e na memória.
 * - A chave bruta é exibida uma única vez no momento da criação.
 * - Suporte a isolamento multi-tenant e revogação instantânea de chaves.
 */

import crypto from "crypto";
import type { ApiKey } from "@/types/api-key";
import { DEFAULT_DEMO_ORG_ID } from "@/lib/auth/tenant";
import {
  createServerSupabaseClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";

export interface GeneratedApiKey {
  rawKey: string;
  keyHash: string;
  keyPrefix: string;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  organizationId?: string;
  keyId?: string;
  name?: string;
  error?: string;
}

/**
 * Chaves de API pré-configuradas para sandbox/testes automatizados
 */
export const VALID_STATIC_API_KEYS = new Set([
  "acelera_api_key_live_123",
  "test_api_key",
  "demo_store_api_key",
  "acelera_secret_token_live",
  "acelera_lead_ingest_v1_key",
]);

/**
 * Gera o hash criptográfico SHA-256 de uma chave de API
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey.trim()).digest("hex");
}

/**
 * Gera uma nova chave de API criptograficamente segura com prefixo e hash SHA-256
 */
export function generateApiKey(environment: "live" | "test" = "live"): GeneratedApiKey {
  const randomHex = crypto.randomBytes(24).toString("hex");
  const rawKey = `acelera_${environment}_${randomHex}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = `${rawKey.slice(0, 16)}...`;

  return {
    rawKey,
    keyHash,
    keyPrefix,
  };
}

/**
 * Chaves iniciais simuladas em memória para o modo demonstração
 */
const initialMemoryApiKeys: ApiKey[] = [
  {
    id: "key-meta-ads-01",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Meta Ads - Campanha Instagram & Facebook 2026",
    key_prefix: "acelera_live_0001...",
    key_hash: hashApiKey("acelera_live_00000000000000000000000000000001"),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    last_used_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    revoked_at: null,
    expires_at: null,
    is_active: true,
  },
  {
    id: "key-webmotors-02",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Webmotors Pro - Ingestão Direta de Estoque",
    key_prefix: "acelera_live_0002...",
    key_hash: hashApiKey("acelera_live_00000000000000000000000000000002"),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 35).toISOString(),
    last_used_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    revoked_at: null,
    expires_at: null,
    is_active: true,
  },
  {
    id: "key-olx-03",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "OLX Autos - Integração Antiga (Descontinuada)",
    key_prefix: "acelera_live_0003...",
    key_hash: hashApiKey("acelera_live_00000000000000000000000000000003"),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
    last_used_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(),
    revoked_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    expires_at: null,
    is_active: false,
  },
];

export const memoryApiKeys: ApiKey[] = [...initialMemoryApiKeys];

/**
 * Reseta o repositório em memória para os valores padrão (útil para suítes de testes)
 */
export function resetMemoryApiKeys(): void {
  memoryApiKeys.length = 0;
  memoryApiKeys.push(...initialMemoryApiKeys.map((k) => ({ ...k })));
}

/**
 * Valida a autenticidade de uma chave de API recebida em rotas públicas de ingestão.
 * Verifica a validade do hash, checa se não está revogada e atualiza o timestamp de último uso.
 */
export async function validateApiKey(rawKey: string | null | undefined): Promise<ApiKeyValidationResult> {
  if (!rawKey || typeof rawKey !== "string" || !rawKey.trim()) {
    return { valid: false, error: "Chave de API não fornecida." };
  }

  const trimmedKey = rawKey.trim();

  // 1. Validação restrita de chaves de teste (somente em ambiente de testes unitários/CI)
  const isTestEnvironment =
    process.env.NODE_ENV === "test" ||
    process.env.VITEST === "true" ||
    process.env.PLAYWRIGHT_TEST === "true";

  if (isTestEnvironment && VALID_STATIC_API_KEYS.has(trimmedKey)) {
    return {
      valid: true,
      organizationId: DEFAULT_DEMO_ORG_ID,
      name: "Chave de Teste / Sandbox (CI/Test Runner)",
    };
  }

  // Chave mestra configurada explicitamente por variável de ambiente de servidor
  const envKey = process.env.STORE_API_KEY || process.env.ACELERA_WEBHOOK_API_KEY;
  if (envKey && trimmedKey === envKey) {
    return {
      valid: true,
      organizationId: process.env.DEFAULT_STORE_ORG_ID || DEFAULT_DEMO_ORG_ID,
      name: "Chave de Servidor (.env Segura)",
    };
  }

  const calculatedHash = hashApiKey(trimmedKey);

  // 2. Consulta no Supabase (se configurado)
  if (isSupabaseServerConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const response = await supabase
        .from("api_keys")
        .select("id, organization_id, name, revoked_at, expires_at")
        .eq("key_hash", calculatedHash)
        .is("revoked_at", null)
        .maybeSingle();

      const data = response.data;

      if (!response.error && data) {
        // Verifica expiração se houver
        if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
          return { valid: false, error: "Chave de API expirada." };
        }

        // Atualiza last_used_at de forma não bloqueante
        supabase
          .from("api_keys")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", data.id)
          .then(() => {});

        return {
          valid: true,
          organizationId: data.organization_id,
          keyId: data.id,
          name: data.name,
        };
      }
    } catch {
      // Fallback para memória em caso de indisponibilidade
    }
  }

  // 3. Consulta no repositório em memória (comparação estrita de Hash SHA-256)
  const memoryKey = memoryApiKeys.find((k) => k.key_hash === calculatedHash);

  if (memoryKey) {
    if (memoryKey.revoked_at || !memoryKey.is_active) {
      return { valid: false, error: "Chave de API revogada." };
    }

    if (memoryKey.expires_at && new Date(memoryKey.expires_at).getTime() < Date.now()) {
      return { valid: false, error: "Chave de API expirada." };
    }

    memoryKey.last_used_at = new Date().toISOString();
    return {
      valid: true,
      organizationId: memoryKey.organization_id,
      keyId: memoryKey.id,
      name: memoryKey.name,
    };
  }

  return { valid: false, error: "Chave de API inválida ou revogada." };
}
