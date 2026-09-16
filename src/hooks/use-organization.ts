/**
 * @file use-organization.ts
 * @description Hook customizado para obter o contexto e nome da organização ativa.
 *
 * Utiliza cache em memória para responder instantaneamente sem dependência obrigatória de React Query,
 * funcionando de forma transparente no client-side e testes unitários.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { getCurrentUserProfileAction } from "@/app/actions/auth";

interface CachedOrgData {
  id: string | null;
  name: string | null;
  timestamp: number;
}

let memoryCache: CachedOrgData | null = null;
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutos

export interface UseOrganizationResult {
  organization: { id: string | null; name: string | null } | null;
  organizationName: string | null;
  organizationId: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useOrganization(): UseOrganizationResult {
  const [orgName, setOrgName] = useState<string | null>(() => memoryCache?.name ?? null);
  const [orgId, setOrgId] = useState<string | null>(() => memoryCache?.id ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(() => !memoryCache);

  useEffect(() => {
    let isMounted = true;

    async function fetchOrganization() {
      try {
        if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_TTL_MS) {
          return;
        }

        const profile = await getCurrentUserProfileAction();
        if (!isMounted) return;

        if (profile) {
          const resolvedName = profile.organizationName || null;
          const resolvedId = profile.organizationId || null;

          memoryCache = {
            id: resolvedId,
            name: resolvedName,
            timestamp: Date.now(),
          };

          setOrgName(resolvedName);
          setOrgId(resolvedId);
        }
      } catch {
        // Silencioso em caso de erro de rede ou modo offline
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void fetchOrganization();

    return () => {
      isMounted = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const profile = await getCurrentUserProfileAction();
      if (profile) {
        const resolvedName = profile.organizationName || null;
        const resolvedId = profile.organizationId || null;

        memoryCache = {
          id: resolvedId,
          name: resolvedName,
          timestamp: Date.now(),
        };

        setOrgName(resolvedName);
        setOrgId(resolvedId);
      }
    } catch {
      // Silencioso
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    organization: orgId || orgName ? { id: orgId, name: orgName } : null,
    organizationName: orgName,
    organizationId: orgId,
    isLoading,
    refetch,
  };
}

export const useCurrentOrg = useOrganization;
