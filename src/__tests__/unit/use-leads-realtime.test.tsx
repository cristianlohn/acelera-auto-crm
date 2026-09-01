/**
 * @file use-leads-realtime.test.tsx
 * @description Suíte de Testes Unitários para o Hook useLeadsRealtime com TanStack Query v5 e Supabase Realtime.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLeadsRealtime } from "@/hooks/use-leads-realtime";
import { toast } from "sonner";

// Mock do Sonner Toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

type RealtimeCallback = (payload: Record<string, unknown>) => void;
type SubscribeCallback = (status: string) => void;

interface MockChannel {
  on: (
    type: string,
    config: { event: string; [key: string]: unknown },
    callback: RealtimeCallback
  ) => MockChannel;
  subscribe: (callback: SubscribeCallback) => MockChannel;
}

interface MockSupabaseClient {
  channel: (name: string) => MockChannel;
  removeChannel: (channel: MockChannel) => void;
}

let handlers: Record<string, RealtimeCallback> = {};

const mockChannel: MockChannel = {
  on: vi.fn().mockImplementation((_type: string, config: { event: string }, callback: RealtimeCallback) => {
    handlers[config.event] = callback;
    return mockChannel;
  }),
  subscribe: vi.fn().mockImplementation((callback: SubscribeCallback) => {
    callback("SUBSCRIBED");
    return mockChannel;
  }),
};

const mockSupabase: MockSupabaseClient = {
  channel: vi.fn().mockReturnValue(mockChannel),
  removeChannel: vi.fn(),
};

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(() => mockSupabase),
}));

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("[UNIT-HOOK] useLeadsRealtime com TanStack Query v5", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = {};

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key-123";

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it("deve invalidar a queryKey ['leads'] quando receber um evento INSERT via Realtime", () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    renderHook(
      () =>
        useLeadsRealtime({
          organizationId: "org-tenant-123",
          isDemo: false,
        }),
      { wrapper: createWrapper(queryClient) }
    );

    expect(mockSupabase.channel).toHaveBeenCalledWith("realtime-leads-org-org-tenant-123");
    expect(handlers["INSERT"]).toBeDefined();

    // Simula evento de INSERT do Supabase Realtime
    handlers["INSERT"]({
      new: {
        id: "lead-new-001",
        name: "Carlos Comprador",
        phone: "11988887777",
        vehicle_interest: "Toyota Yaris",
        organization_id: "org-tenant-123",
        status: "novo",
      },
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["leads"] });
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("Carlos Comprador"),
      expect.any(Object)
    );
  });

  it("deve invalidar ['leads'] e ['lead', id] quando receber um evento UPDATE via Realtime", () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    renderHook(
      () =>
        useLeadsRealtime({
          organizationId: "org-tenant-123",
          isDemo: false,
        }),
      { wrapper: createWrapper(queryClient) }
    );

    expect(handlers["UPDATE"]).toBeDefined();

    handlers["UPDATE"]({
      new: {
        id: "lead-abc-999",
        name: "Carlos Atualizado",
        status: "proposta",
        organization_id: "org-tenant-123",
      },
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["leads"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["lead", "lead-abc-999"] });
  });

  it("deve invalidar ['leads'] e limpar canal ao desmontar", () => {
    const { unmount } = renderHook(
      () =>
        useLeadsRealtime({
          organizationId: "org-tenant-123",
          isDemo: false,
        }),
      { wrapper: createWrapper(queryClient) }
    );

    unmount();
    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });
});
