/**
 * @file leads-realtime.test.ts
 * @description Suíte de Testes Unitários para o Hook useLeadsRealtime e Supabase Realtime.
 *
 * Cenários Testados:
 * - [UT-RT.1]: Não inicia conexão WebSocket quando estiver em Modo Demonstração (isDemo = true).
 * - [UT-RT.2]: Não inicia conexão WebSocket quando organizationId for nulo.
 * - [UT-RT.3]: Cria canal isolado por organização ('realtime-leads-org-{id}') com filtro Postgres.
 * - [UT-RT.4]: Processa evento INSERT, invoca callback onLeadInserted e dispara toast de notificação.
 * - [UT-RT.5]: Processa evento UPDATE e invoca callback onLeadUpdated.
 * - [UT-RT.6]: Processa evento DELETE e invoca callback onLeadDeleted com o ID do lead removido.
 * - [UT-RT.7]: Executa limpeza segura removendo o canal do Supabase ao desmontar o componente (cleanup).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLeadsRealtime } from "@/hooks/useLeadsRealtime";
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
  createBrowserClient: () => mockSupabase,
}));

describe("[UT-RT] Sincronização em Tempo Real (useLeadsRealtime)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handlers = {};

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://vnxsmsgykirbgrhjpwhc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("[UT-RT.1] Não deve conectar ao WebSocket quando isDemo = true", () => {
    // Arrange & Act
    renderHook(() =>
      useLeadsRealtime({
        organizationId: "org-123",
        isDemo: true,
      })
    );

    // Assert
    expect(mockSupabase.channel).not.toHaveBeenCalled();
  });

  it("[UT-RT.2] Não deve conectar ao WebSocket quando organizationId for nulo", () => {
    // Arrange & Act
    renderHook(() =>
      useLeadsRealtime({
        organizationId: null,
        isDemo: false,
      })
    );

    // Assert
    expect(mockSupabase.channel).not.toHaveBeenCalled();
  });

  it("[UT-RT.3] Deve criar canal isolado com filtro estrito de organization_id", () => {
    // Arrange & Act
    renderHook(() =>
      useLeadsRealtime({
        organizationId: "org-xyz-999",
        isDemo: false,
      })
    );

    // Assert
    expect(mockSupabase.channel).toHaveBeenCalledWith("realtime-leads-org-org-xyz-999");
    expect(mockChannel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        event: "INSERT",
        schema: "public",
        table: "leads",
        filter: "organization_id=eq.org-xyz-999",
      }),
      expect.any(Function)
    );
  });

  it("[UT-RT.4] Deve processar evento INSERT, invocar onLeadInserted e disparar toast", () => {
    // Arrange
    const onLeadInserted = vi.fn();
    renderHook(() =>
      useLeadsRealtime({
        organizationId: "org-123",
        isDemo: false,
        onLeadInserted,
      })
    );

    // Act (Dispara o evento INSERT registrado no canal)
    const rawPayload = {
      new: {
        id: "lead-realtime-1",
        name: "Carlos Eduardo",
        phone: "11999998888",
        email: "carlos@gmail.com",
        vehicle_interest: "Toyota Corolla Cross 2024",
        status: "novo",
        seller_name: "Roleta Automática",
        origin: "whatsapp",
      },
    };
    handlers["INSERT"](rawPayload);

    // Assert
    expect(onLeadInserted).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "lead-realtime-1",
        name: "Carlos Eduardo",
        vehicleInterest: "Toyota Corolla Cross 2024",
      })
    );
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("Carlos Eduardo"),
      expect.objectContaining({
        description: expect.stringContaining("Toyota Corolla Cross 2024"),
      })
    );
  });

  it("[UT-RT.5] Deve processar evento UPDATE e invocar onLeadUpdated", () => {
    // Arrange
    const onLeadUpdated = vi.fn();
    renderHook(() =>
      useLeadsRealtime({
        organizationId: "org-123",
        isDemo: false,
        onLeadUpdated,
      })
    );

    // Act (Dispara o evento UPDATE)
    const rawPayload = {
      new: {
        id: "lead-realtime-1",
        name: "Carlos Eduardo",
        status: "visita",
        seller_name: "Rafael Alves",
        vehicle_interest: "Toyota Corolla Cross 2024",
      },
    };
    handlers["UPDATE"](rawPayload);

    // Assert
    expect(onLeadUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "lead-realtime-1",
        status: "visita",
        sellerName: "Rafael Alves",
      })
    );
  });

  it("[UT-RT.6] Deve processar evento DELETE e invocar onLeadDeleted com o ID correto", () => {
    // Arrange
    const onLeadDeleted = vi.fn();
    renderHook(() =>
      useLeadsRealtime({
        organizationId: "org-123",
        isDemo: false,
        onLeadDeleted,
      })
    );

    // Act (Dispara o evento DELETE)
    const rawPayload = {
      old: {
        id: "lead-deleted-789",
      },
    };
    handlers["DELETE"](rawPayload);

    // Assert
    expect(onLeadDeleted).toHaveBeenCalledWith("lead-deleted-789");
  });

  it("[UT-RT.7] Deve remover o canal do Supabase ao desmontar o componente (cleanup seguro)", () => {
    // Arrange
    const { unmount } = renderHook(() =>
      useLeadsRealtime({
        organizationId: "org-123",
        isDemo: false,
      })
    );

    // Act
    unmount();

    // Assert
    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });
});
