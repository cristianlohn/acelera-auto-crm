/**
 * @file hooks.test.tsx
 * @description Suíte de testes unitários para os hooks customizados do TanStack Query v5 integrados ao apiClient.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useLeads, useLead, useUpdateLeadStatus } from "@/hooks/use-leads";
import { useVehicles, useCreateVehicle } from "@/hooks/use-vehicles";
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from "@/hooks/use-api-keys";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("[UNIT-HOOKS] TanStack Query v5 Hooks com apiClient", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  describe("Hooks de Leads (use-leads)", () => {
    it("useLeads: deve buscar a lista de leads com parâmetros de filtro", async () => {
      const mockData = {
        data: [
          {
            id: "lead-1",
            name: "Cliente Teste",
            phone: "11988887777",
            status: "novo" as const,
            vehicle_interest: "Honda Civic",
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        total_pages: 1,
      };

      const getSpy = vi.spyOn(apiClient, "GET").mockResolvedValueOnce({
        data: mockData,
        error: undefined,
        response: new Response(),
      } as never);

      const { result } = renderHook(
        () => useLeads({ page: 1, limit: 10, status: "novo" }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(getSpy).toHaveBeenCalledWith("/api/v1/leads", {
        params: { query: { page: 1, limit: 10, status: "novo" } },
      });
      expect(result.current.data).toEqual(mockData);
    });

    it("useLead: deve buscar os detalhes de um lead por ID", async () => {
      const mockLead = {
        data: {
          id: "lead-abc",
          name: "Carlos Consultor",
          phone: "11977776666",
          status: "atendimento" as const,
        },
      };

      const getSpy = vi.spyOn(apiClient, "GET").mockResolvedValueOnce({
        data: mockLead,
        error: undefined,
        response: new Response(),
      } as never);

      const { result } = renderHook(() => useLead("lead-abc"), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(getSpy).toHaveBeenCalledWith("/api/v1/leads/{id}", {
        params: { path: { id: "lead-abc" } },
      });
      expect(result.current.data).toEqual(mockLead);
    });

    it("useUpdateLeadStatus: deve atualizar o status do lead e invalidar cache", async () => {
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const patchSpy = vi.spyOn(apiClient, "PATCH").mockResolvedValueOnce({
        data: { success: true, message: "Atualizado" },
        error: undefined,
        response: new Response(),
      } as never);

      const { result } = renderHook(() => useUpdateLeadStatus(), {
        wrapper: createWrapper(queryClient),
      });

      await result.current.mutateAsync({
        id: "lead-123",
        status: "visita",
        notes: "Visita agendada para sábado",
      });

      expect(patchSpy).toHaveBeenCalledWith("/api/v1/leads/{id}", {
        params: { path: { id: "lead-123" } },
        body: {
          status: "visita",
          notes: "Visita agendada para sábado",
          seller_id: undefined,
          seller_name: undefined,
        },
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["leads"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["lead", "lead-123"] });
    });
  });

  describe("Hooks de Veículos (use-vehicles)", () => {
    it("useVehicles: deve buscar veículos com filtros", async () => {
      const mockVehicles = {
        data: [
          {
            id: "veh-1",
            make: "Toyota",
            model: "Corolla",
            year_fab: 2024,
            year_model: 2025,
            price: 150000,
            status: "disponivel",
          },
        ],
      };

      const getSpy = vi.spyOn(apiClient, "GET").mockResolvedValueOnce({
        data: mockVehicles,
        error: undefined,
        response: new Response(),
      } as never);

      const { result } = renderHook(
        () => useVehicles({ make: "Toyota", status: "disponivel" }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(getSpy).toHaveBeenCalledWith("/api/v1/vehicles", {
        params: { query: { make: "Toyota", status: "disponivel" } },
      });
      expect(result.current.data).toEqual(mockVehicles);
    });

    it("useCreateVehicle: deve cadastrar veículo e invalidar a lista de veículos", async () => {
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const postSpy = vi.spyOn(apiClient, "POST").mockResolvedValueOnce({
        data: { success: true, vehicle_id: "veh-new" },
        error: undefined,
        response: new Response(),
      } as never);

      const { result } = renderHook(() => useCreateVehicle(), {
        wrapper: createWrapper(queryClient),
      });

      const newVehicle = {
        make: "Jeep",
        model: "Compass",
        year_fab: 2023,
        year_model: 2024,
        price: 180000,
        mileage: 15000,
        plate_last_digits: "ABC1D23",
        color: "Preto",
        status: "disponivel" as const,
      };

      await result.current.mutateAsync(newVehicle);

      expect(postSpy).toHaveBeenCalledWith("/api/v1/vehicles", {
        body: newVehicle,
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["vehicles"] });
    });
  });

  describe("Hooks de API Keys (use-api-keys)", () => {
    it("useApiKeys: deve listar chaves ativas do tenant", async () => {
      const mockKeys = {
        data: [
          {
            id: "key-1",
            name: "Meta Ads 2026",
            key_prefix: "acelera_live_01",
            status: "active",
          },
        ],
      };

      const getSpy = vi.spyOn(apiClient, "GET").mockResolvedValueOnce({
        data: mockKeys,
        error: undefined,
        response: new Response(),
      } as never);

      const { result } = renderHook(() => useApiKeys(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(getSpy).toHaveBeenCalledWith("/api/v1/settings/api-keys");
      expect(result.current.data).toEqual(mockKeys);
    });

    it("useCreateApiKey: deve criar nova chave de API e invalidar cache", async () => {
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const postSpy = vi.spyOn(apiClient, "POST").mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            id: "key-new",
            name: "Nova Chave",
            api_key: "acelera_live_sample",
          },
        },
        error: undefined,
        response: new Response(),
      } as never);

      const { result } = renderHook(() => useCreateApiKey(), {
        wrapper: createWrapper(queryClient),
      });

      await result.current.mutateAsync({
        name: "Nova Chave",
        expires_in_days: 90,
      });

      expect(postSpy).toHaveBeenCalledWith("/api/v1/settings/api-keys", {
        body: {
          name: "Nova Chave",
          expires_in_days: 90,
        },
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["api-keys"] });
    });

    it("useRevokeApiKey: deve revogar chave existente e invalidar cache", async () => {
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const deleteSpy = vi.spyOn(apiClient, "DELETE").mockResolvedValueOnce({
        data: { success: true, message: "Revogada" },
        error: undefined,
        response: new Response(),
      } as never);

      const { result } = renderHook(() => useRevokeApiKey(), {
        wrapper: createWrapper(queryClient),
      });

      await result.current.mutateAsync("key-to-revoke");

      expect(deleteSpy).toHaveBeenCalledWith("/api/v1/settings/api-keys/{id}", {
        params: { path: { id: "key-to-revoke" } },
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["api-keys"] });
    });
  });
});
