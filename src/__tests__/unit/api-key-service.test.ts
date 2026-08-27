/**
 * @file api-key-service.test.ts
 * @description Suíte de testes unitários para o Serviço Criptográfico de Chaves de API.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generateApiKey,
  hashApiKey,
  validateApiKey,
  resetMemoryApiKeys,
} from "@/lib/services/api-key-service";
import {
  getApiKeysAction,
  createApiKeyAction,
  revokeApiKeyAction,
} from "@/app/actions/api-key-actions";
import { DEFAULT_DEMO_ORG_ID } from "@/lib/auth/tenant";
import * as supabaseServerModule from "@/lib/supabase/server";

describe("[UNIT-API-KEY] Serviço de Criptografia e Gestão de Chaves de API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(supabaseServerModule, "isSupabaseServerConfigured").mockReturnValue(false);
    resetMemoryApiKeys();
  });

  it("[TEST-KEY-01] Deve gerar chave de API com prefixo acelera_live_ e hash SHA-256 de 64 caracteres", () => {
    const { rawKey, keyHash, keyPrefix } = generateApiKey("live");

    expect(rawKey).toMatch(/^acelera_live_[a-f0-9]{48}$/);
    expect(keyHash).toHaveLength(64);
    expect(keyPrefix).toMatch(/^acelera_live_\w{3}\.\.\.$/);

    // Valida idempotência do algoritmo SHA-256
    const recomputedHash = hashApiKey(rawKey);
    expect(recomputedHash).toBe(keyHash);
  });

  it("[TEST-KEY-02] Deve gerar chave para ambiente de teste com prefixo acelera_test_", () => {
    const { rawKey, keyPrefix } = generateApiKey("test");

    expect(rawKey).toMatch(/^acelera_test_[a-f0-9]{48}$/);
    expect(keyPrefix).toMatch(/^acelera_test_\w{3}\.\.\.$/);
  });

  it("[TEST-KEY-03] Deve criar nova chave via Server Action com persistência e revelação única da rawKey", async () => {
    const keyName = "Integração Webmotors Curitiba 2026";
    const result = await createApiKeyAction({
      name: keyName,
      expires_in_days: 90,
    });

    expect(result.success).toBe(true);
    expect(result.rawKey).toBeDefined();
    expect(result.rawKey).toMatch(/^acelera_live_/);
    expect(result.keyPrefix).toBeDefined();
    expect(result.name).toBe(keyName);
    expect(result.key?.is_active).toBe(true);

    // Valida que a chave é consultável via getApiKeysAction
    const allKeys = await getApiKeysAction(DEFAULT_DEMO_ORG_ID);
    const createdKey = allKeys.find((k) => k.id === result.key?.id);
    expect(createdKey).toBeDefined();
    expect(createdKey?.name).toBe(keyName);
  });

  it("[TEST-KEY-04] Deve validar com sucesso uma chave de API ativa e retornar o organizationId", async () => {
    const createResult = await createApiKeyAction({
      name: "Meta Ads Lead Ads Ingestion",
    });
    expect(createResult.rawKey).toBeDefined();

    const validation = await validateApiKey(createResult.rawKey!);
    expect(validation.valid).toBe(true);
    expect(validation.organizationId).toBe(DEFAULT_DEMO_ORG_ID);
  });

  it("[TEST-KEY-05] Deve revogar uma chave existente e rejeitar tentativas de autenticação subsequentes", async () => {
    const createResult = await createApiKeyAction({
      name: "Chave Temporária para Revogação",
    });
    const keyId = createResult.key!.id;
    const rawKey = createResult.rawKey!;

    // 1. Valida antes da revogação
    const beforeRevoke = await validateApiKey(rawKey);
    expect(beforeRevoke.valid).toBe(true);

    // 2. Executa revogação via Server Action
    const revokeResult = await revokeApiKeyAction(keyId);
    expect(revokeResult.success).toBe(true);

    // 3. Valida rejeição após revogação
    const afterRevoke = await validateApiKey(rawKey);
    expect(afterRevoke.valid).toBe(false);
    expect(afterRevoke.error).toMatch(/revogada/i);

    // 4. Confirma na listagem de chaves que is_active é false
    const allKeys = await getApiKeysAction(DEFAULT_DEMO_ORG_ID);
    const revokedKey = allKeys.find((k) => k.id === keyId);
    expect(revokedKey?.is_active).toBe(false);
    expect(revokedKey?.revoked_at).not.toBeNull();
  });

  it("[TEST-KEY-06] Deve rejeitar chaves inexistentes, vazias ou inválidas", async () => {
    const resEmpty = await validateApiKey("");
    expect(resEmpty.valid).toBe(false);

    const resNull = await validateApiKey(null);
    expect(resNull.valid).toBe(false);

    const resFake = await validateApiKey("acelera_live_000000000000000000000000000000000000000000000000");
    expect(resFake.valid).toBe(false);
  });
});
