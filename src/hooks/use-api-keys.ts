/**
 * @file use-api-keys.ts
 * @description Hooks customizados do TanStack Query v5 para gerenciamento de Chaves de API e Integrações (/api/v1/settings/api-keys).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { paths } from "@/types/api";

export type CreateApiKeyInput = NonNullable<
  paths["/api/v1/settings/api-keys"]["post"]["requestBody"]
>["content"]["application/json"];

/**
 * Hook para consulta de todas as chaves de API ativas vinculadas ao tenant autenticado.
 */
export function useApiKeys() {
  return useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/settings/api-keys");

      if (error) {
        const message =
          (error as { error?: string }).error || "Falha ao listar chaves de API da organização.";
        throw new Error(message);
      }

      return data;
    },
  });
}

/**
 * Hook de mutação para geração de uma nova chave de API criptográfica.
 * Invalida automaticamente a query ['api-keys'] após sucesso.
 */
export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateApiKeyInput) => {
      const { data, error } = await apiClient.POST("/api/v1/settings/api-keys", {
        body: payload,
      });

      if (error) {
        const message =
          (error as { error?: string }).error || "Falha ao criar nova chave de API.";
        throw new Error(message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
}

/**
 * Hook de mutação para revogação imediata de uma chave de API existente.
 * Invalida automaticamente a query ['api-keys'] após sucesso.
 */
export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await apiClient.DELETE("/api/v1/settings/api-keys/{id}", {
        params: {
          path: { id },
        },
      });

      if (error) {
        const message =
          (error as { error?: string }).error || "Falha ao revogar chave de API.";
        throw new Error(message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
}
