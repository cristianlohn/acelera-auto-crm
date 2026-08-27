/**
 * @file api-key.ts
 * @description Tipagens para o módulo de Gestão de Chaves de API e Integrações.
 */

export interface ApiKey {
  id: string;
  organization_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  is_active: boolean;
}

export interface CreateApiKeyPayload {
  name: string;
  expires_in_days?: number | null;
}

export interface CreateApiKeyResult {
  success: boolean;
  rawKey?: string;
  keyPrefix?: string;
  name?: string;
  error?: string;
  key?: ApiKey;
}

export interface ApiKeyListItem {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  is_active: boolean;
}
