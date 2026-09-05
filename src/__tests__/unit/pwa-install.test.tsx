/**
 * @file pwa-install.test.tsx
 * @description Suíte de Testes Unitários e de Integração do Módulo PWA e Componente InstallAppButton.
 *
 * Cenários Testados:
 * - [PWA-01]: Validação da rota de manifesto (manifest.ts) com metadados corretos.
 * - [PWA-02]: Ocultação do botão quando a aplicação já estiver rodando em modo standalone (PWA instalado).
 * - [PWA-03]: Ocultação inicial no Android/Desktop quando o evento beforeinstallprompt ainda não foi disparado.
 * - [PWA-04]: Exibição e disparo de prompt nativo quando evento beforeinstallprompt é emitido (Android/Chrome).
 * - [PWA-05]: Exibição em dispositivos iOS (iPhone/iPad) e abertura do modal explicativo de 2 passos no clique.
 * - [PWA-06]: Fechamento do modal iOS ao clicar no botão "Entendi".
 * - [PWA-07]: Ocultação reativa após o evento appinstalled.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import manifest from "@/app/manifest";
import { InstallAppButton } from "@/components/pwa/install-button";

describe("[PWA-01] Manifesto PWA (src/app/manifest.ts)", () => {
  it("deve retornar o manifesto configurado com nome, rota inicial, display standalone e ícones", () => {
    const config = manifest();

    expect(config.name).toBe("Acelera Auto CRM");
    expect(config.short_name).toBe("Acelera Auto");
    expect(config.description).toBe("Gestão Inteligente de Leads e Estoque Automotivo");
    expect(config.start_url).toBe("/cockpit");
    expect(config.display).toBe("standalone");
    expect(config.background_color).toBe("#09090b");
    expect(config.theme_color).toBe("#f97316");

    expect(config.icons).toBeDefined();
    expect(config.icons?.length).toBeGreaterThanOrEqual(2);

    const maskableIcon = config.icons?.find((icon) => icon.purpose === "maskable");
    expect(maskableIcon).toBeDefined();
    expect(maskableIcon?.sizes).toBe("192x192");

    const anyIcon = config.icons?.find((icon) => icon.purpose === "any");
    expect(anyIcon).toBeDefined();
    expect(anyIcon?.sizes).toBe("512x512");
  });
});

describe("[PWA-02..07] Componente de Instalação Inteligente (InstallAppButton)", () => {
  const originalMatchMedia = window.matchMedia;
  const originalUserAgent = window.navigator.userAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: desktop standard browser, not standalone
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      configurable: true,
    });
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window.navigator, "userAgent", {
      value: originalUserAgent,
      configurable: true,
    });
  });

  it("[PWA-02] NÃO deve renderizar o botão quando já estiver em modo standalone (PWA instalado)", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("display-mode: standalone"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container } = render(<InstallAppButton />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("btn-install-app")).not.toBeInTheDocument();
  });

  it("[PWA-03] NÃO deve renderizar o botão no Desktop/Android antes do disparo de beforeinstallprompt", () => {
    const { container } = render(<InstallAppButton />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("btn-install-app")).not.toBeInTheDocument();
  });

  it("[PWA-04] DEVE renderizar e disparar prompt nativo quando o evento beforeinstallprompt é disparado (Android/Chromium)", async () => {
    render(<InstallAppButton />);

    const mockPrompt = vi.fn().mockResolvedValue(undefined);
    const mockUserChoice = Promise.resolve({ outcome: "accepted" as const, platform: "web" });

    const installEvent = new Event("beforeinstallprompt");
    Object.assign(installEvent, {
      prompt: mockPrompt,
      userChoice: mockUserChoice,
      platforms: ["web"],
    });

    act(() => {
      window.dispatchEvent(installEvent);
    });

    const installBtn = screen.getByTestId("btn-install-app");
    expect(installBtn).toBeInTheDocument();
    expect(installBtn).toHaveTextContent(/Instalar Aplicativo/i);

    // Clica no botão para abrir prompt nativo
    await act(async () => {
      fireEvent.click(installBtn);
    });

    expect(mockPrompt).toHaveBeenCalledTimes(1);
  });

  it("[PWA-05] DEVE renderizar no iOS e abrir o modal guiado de 2 passos ao clicar", () => {
    // Simula User Agent de iPhone / Safari
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      configurable: true,
    });

    render(<InstallAppButton />);

    const installBtn = screen.getByTestId("btn-install-app");
    expect(installBtn).toBeInTheDocument();

    // Clica para abrir modal iOS
    fireEvent.click(installBtn);

    expect(screen.getByTestId("dialog-install-ios")).toBeInTheDocument();
    expect(screen.getByText("Instalar no seu iPhone")).toBeInTheDocument();
    expect(screen.getByText(/Compartilhar/i)).toBeInTheDocument();
    expect(screen.getByText(/Adicionar à Tela de Início/i)).toBeInTheDocument();
  });

  it("[PWA-06] DEVE fechar o modal iOS ao clicar no botão 'Entendi'", () => {
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      configurable: true,
    });

    render(<InstallAppButton />);

    fireEvent.click(screen.getByTestId("btn-install-app"));
    expect(screen.getByTestId("dialog-install-ios")).toBeInTheDocument();

    const closeBtn = screen.getByTestId("btn-close-ios-install");
    fireEvent.click(closeBtn);

    expect(screen.queryByTestId("dialog-install-ios")).not.toBeInTheDocument();
  });

  it("[PWA-07] DEVE ocultar o botão após o evento appinstalled", () => {
    render(<InstallAppButton />);

    // 1. Emite beforeinstallprompt para exibir o botão
    const installEvent = new Event("beforeinstallprompt");
    Object.assign(installEvent, {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: "accepted" as const, platform: "web" }),
    });

    act(() => {
      window.dispatchEvent(installEvent);
    });

    expect(screen.getByTestId("btn-install-app")).toBeInTheDocument();

    // 2. Dispara evento de instalação concluída
    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });

    // Botão é ocultado
    expect(screen.queryByTestId("btn-install-app")).not.toBeInTheDocument();
  });
});
