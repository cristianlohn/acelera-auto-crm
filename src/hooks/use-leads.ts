/**
 * @file use-leads.ts
 * @description Hooks customizados do TanStack Query v5 para consumo tipado dos endpoints de Leads (/api/v1/leads).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { paths } from "@/types/api";

export type LeadFilters = NonNullable<
  paths["/api/v1/leads"]["get"]["parameters"]["query"]
>;

export type UpdateLeadStatusInput = {
  id: string;
  status: "novo" | "atendimento" | "visita" | "proposta" | "fechado";
  notes?: string;
  seller_id?: string | null;
  seller_name?: string | null;
};

/**
 * Hook para consulta paginada e filtrada de leads com cache automático.
 */
export function useLeads(filters?: LeadFilters) {
  return useQuery({
    queryKey: ["leads", filters],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/leads", {
        params: {
          query: filters,
        },
      });

      if (error) {
        const message =
          (error as { error?: string }).error || "Falha ao carregar a listagem de leads.";
        throw new Error(message);
      }

      return data;
    },
  });
}

/**
 * Hook para consulta individual dos detalhes de um lead por ID.
 */
export function useLead(id: string) {
  return useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/leads/{id}", {
        params: {
          path: { id },
        },
      });

      if (error) {
        const message =
          (error as { error?: string }).error || `Falha ao carregar lead com ID ${id}.`;
        throw new Error(message);
      }

      return data;
    },
    enabled: Boolean(id),
  });
}

/**
 * Hook de mutação para atualização de status e funil de vendas de um lead.
 * Invalida automaticamente as queries ['leads'] e ['lead', id] após sucesso.
 */
export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, notes, seller_id, seller_name }: UpdateLeadStatusInput) => {
      const { data, error } = await apiClient.PATCH("/api/v1/leads/{id}", {
        params: {
          path: { id },
        },
        body: {
          status,
          notes,
          seller_id: seller_id ?? undefined,
          seller_name: seller_name ?? undefined,
        },
      });

      if (error) {
        const message =
          (error as { error?: string }).error || "Falha ao atualizar o status do lead.";
        throw new Error(message);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead", variables.id] });
    },
  });
}
