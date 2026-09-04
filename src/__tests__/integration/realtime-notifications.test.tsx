/**
 * @file realtime-notifications.test.tsx
 * @description Testes de Integração para Notificações e Alertas Sonoros em Tempo Real.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RealtimeNotificationProvider } from "@/components/providers/realtime-notification-provider";
import { SoundToggle } from "@/components/audio/sound-toggle";
import { soundManager } from "@/lib/utils/audio-alerts";
import { SettingsForm } from "@/components/settings/settings-form";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DemoRoleProvider } from "@/context/demo-role-context";

let mockChannelCallback: ((payload: Record<string, unknown>) => void) | null = null;

const createMockChannel = () => {
  const channel = {
    on: vi.fn().mockImplementation((event, filter, cb) => {
      mockChannelCallback = cb;
      return channel;
    }),
    subscribe: vi.fn().mockImplementation(() => channel),
  };
  return channel;
};

const mockChannel = createMockChannel();

const mockSupabaseClient = {
  channel: vi.fn().mockReturnValue(mockChannel),
  removeChannel: vi.fn(),
};

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn().mockImplementation(() => mockSupabaseClient),
}));

describe("[IT-REALTIME-AUDIO] Notificações e Alertas Sonoros em Tempo Real", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockChannelCallback = null;
    queryClient = new QueryClient();
    localStorage.clear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("deve desbloquear o áudio no primeiro clique do usuário na janela", () => {
    const unlockSpy = vi.spyOn(soundManager, "unlockAudio");

    render(
      <QueryClientProvider client={queryClient}>
        <DemoRoleProvider initialDemoMode={false}>
          <RealtimeNotificationProvider organizationId="org-123">
            <div data-testid="child-content">App Content</div>
          </RealtimeNotificationProvider>
        </DemoRoleProvider>
      </QueryClientProvider>
    );

    fireEvent.click(window);
    expect(unlockSpy).toHaveBeenCalled();
  });

  it("deve tocar som de novo lead e atualizar cache ao receber INSERT do Supabase Realtime", () => {
    const playLeadSoundSpy = vi.spyOn(soundManager, "playNewLeadSound").mockImplementation(() => {});

    render(
      <QueryClientProvider client={queryClient}>
        <DemoRoleProvider initialDemoMode={false}>
          <RealtimeNotificationProvider organizationId="org-123">
            <div>Dashboard</div>
          </RealtimeNotificationProvider>
        </DemoRoleProvider>
      </QueryClientProvider>
    );

    expect(mockSupabaseClient.channel).toHaveBeenCalledWith("org-leads-org-123");
    expect(mockChannelCallback).toBeDefined();

    // Simula evento de INSERT vindo do Supabase WebSocket
    mockChannelCallback?.({
      new: {
        id: "lead-new-1",
        name: "Carlos Ferreira",
        vehicle_interest: "Toyota Corolla Cross 2024",
        origin: "meta",
      },
    });

    expect(playLeadSoundSpy).toHaveBeenCalledTimes(1);
  });

  it("deve alternar estado de mudo através do SoundToggle", () => {
    render(<SoundToggle showLabel={true} />);

    const button = screen.getByTestId("btn-sound-toggle");
    expect(button).toBeInTheDocument();
    expect(screen.getByText("Som Ativado")).toBeInTheDocument();

    // Clica para mutar
    fireEvent.click(button);
    expect(screen.getByText("Som Desativado")).toBeInTheDocument();
    expect(soundManager.getMuted()).toBe(true);

    // Clica para desmutar
    fireEvent.click(button);
    expect(screen.getByText("Som Ativado")).toBeInTheDocument();
    expect(soundManager.getMuted()).toBe(false);
  });

  it("deve acionar som de teste de lead e SLA a partir da tela de Configurações", () => {
    const playLeadSoundSpy = vi.spyOn(soundManager, "playNewLeadSound").mockImplementation(() => {});
    const playSlaSoundSpy = vi.spyOn(soundManager, "playSlaBreachSound").mockImplementation(() => {});

    render(
      <QueryClientProvider client={queryClient}>
        <DemoRoleProvider initialDemoMode={false}>
          <SettingsForm />
        </DemoRoleProvider>
      </QueryClientProvider>
    );

    // Abre aba de Preferências
    const prefTab = screen.getByRole("tab", { name: /preferências & notificações/i });
    fireEvent.click(prefTab);

    // Clica no botão Testar Som de Lead
    const btnTestLead = screen.getByTestId("btn-test-lead-sound");
    fireEvent.click(btnTestLead);
    expect(playLeadSoundSpy).toHaveBeenCalledTimes(1);

    // Clica no botão Testar Som de SLA
    const btnTestSla = screen.getByTestId("btn-test-sla-sound");
    fireEvent.click(btnTestSla);
    expect(playSlaSoundSpy).toHaveBeenCalledTimes(1);
  });
});
