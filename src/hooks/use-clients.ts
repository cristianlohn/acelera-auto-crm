/**
 * @file use-clients.ts
 * @description Hook customizado fortemente tipado com TanStack Query v5 para gestão de Clientes.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getClients,
  saveClientAction,
  deleteClientAction,
} from "@/app/actions/clients";
import type { ClientFilters, SaveClientInput } from "@/lib/validations/client";
import type { Client } from "@/types/crm";

export const CLIENTS_QUERY_KEY = ["clients"] as const;

export function useClients(
  filters?: Partial<ClientFilters>,
  initialData?: Client[],
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [...CLIENTS_QUERY_KEY, filters],
    queryFn: () => getClients(filters),
    initialData,
    staleTime: 1000 * 60 * 2,
    enabled: options?.enabled ?? true,
  });
}

export function useSaveClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SaveClientInput) => saveClientAction(data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
      }
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteClientAction(id),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
      }
    },
  });
}
