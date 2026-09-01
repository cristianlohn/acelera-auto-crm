/**
 * @file use-vehicles.ts
 * @description Hooks customizados do TanStack Query v5 para consumo tipado dos endpoints de Veículos e Estoque (/api/v1/vehicles).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { paths } from "@/types/api";

export type VehicleFilters = NonNullable<
  paths["/api/v1/vehicles"]["get"]["parameters"]["query"]
>;

export type CreateVehicleInput = NonNullable<
  paths["/api/v1/vehicles"]["post"]["requestBody"]
>["content"]["application/json"];

/**
 * Hook para consulta de veículos do estoque com suporte a filtros e cache inteligente.
 */
export function useVehicles(filters?: VehicleFilters) {
  return useQuery({
    queryKey: ["vehicles", filters],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/vehicles", {
        params: {
          query: filters,
        },
      });

      if (error) {
        const message =
          (error as { error?: string }).error || "Falha ao carregar catálogo de veículos.";
        throw new Error(message);
      }

      return data;
    },
  });
}

/**
 * Hook de mutação para cadastro de novo veículo no estoque.
 * Invalida automaticamente a query ['vehicles'] após o sucesso.
 */
export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newVehicle: CreateVehicleInput) => {
      const { data, error } = await apiClient.POST("/api/v1/vehicles", {
        body: newVehicle,
      });

      if (error) {
        const message =
          (error as { error?: string }).error || "Falha ao cadastrar veículo no estoque.";
        throw new Error(message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });
}
