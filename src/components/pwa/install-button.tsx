/**
 * @file install-button.tsx
 * @description Componente inteligente de instalação PWA (Progressive Web App).
 *
 * Funcionalidades:
 * - Detecta se o aplicativo já está em execução como PWA instalado (standalone mode).
 * - Android / Chromium Desktop: Captura o evento `beforeinstallprompt` e abre o instalador nativo ao clique.
 * - iOS / Safari: Detecta dispositivos Apple e orienta o usuário através de um modal explicativo passo a passo.
 * - Oculta-se automaticamente quando não aplicável ou quando já instalado.
 */

"use client";

import React, { useState, useEffect } from "react";
import { Share, PlusSquare, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface InstallAppButtonProps {
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export function InstallAppButton({
  className,
  variant = "outline",
  size = "sm",
}: InstallAppButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);

    // 1. Verifica se já está rodando como PWA (modo standalone)
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      (typeof document !== "undefined" && document.referrer.includes("android-app://"));

    setIsStandalone(Boolean(isStandaloneMode));

    // 2. Detecta dispositivos Apple (iOS / iPadOS)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice =
      /iphone|ipad|ipod/.test(userAgent) ||
      (typeof navigator !== "undefined" &&
        navigator.platform === "MacIntel" &&
        navigator.maxTouchPoints > 1);

    setIsIOS(isAppleDevice);

    // 3. Captura evento nativo do Android / Chromium
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 4. Trata evento de instalação concluída
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Evita problemas de hidratação no SSR
  if (!isMounted) return null;

  // Não exibe se já estiver rodando em modo standalone (app instalado)
  if (isStandalone) return null;

  // Se não for iOS e não tiver disparado o evento do Android/Chromium ainda, não exibe
  if (!isIOS && !deferredPrompt) return null;

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setDeferredPrompt(null);
        }
      } catch {
        // Fallback gracioso caso prompt falhe
      }
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleInstallClick}
        data-testid="btn-install-app"
        aria-label="Instalar Aplicativo Acelera Auto"
        className={cn(
          "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 hover:text-orange-600 dark:hover:text-orange-300 font-medium gap-2 transition-all shadow-sm",
          className
        )}
      >
        <Smartphone className="h-4 w-4 text-orange-500 shrink-0" />
        <span>Instalar Aplicativo</span>
      </Button>

      {/* Modal Guiado para usuários de iPhone / iPad */}
      <Dialog open={showIOSModal} onOpenChange={setShowIOSModal}>
        <DialogContent
          data-testid="dialog-install-ios"
          className="max-w-xs sm:max-w-md bg-zinc-950 border-zinc-800 text-white p-5 rounded-2xl"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-white">
              <Smartphone className="h-5 w-5 text-orange-500" />
              Instalar no seu iPhone
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs sm:text-sm pt-1.5 leading-relaxed">
              Para usar o CRM em tela cheia como um aplicativo sem a barra do navegador:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs sm:text-sm">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Share className="h-5 w-5" />
              </div>
              <span className="text-zinc-200">
                1. Toque no botão de <strong>Compartilhar</strong> na barra do Safari (ícone de quadrado com seta para cima).
              </span>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400">
                <PlusSquare className="h-5 w-5" />
              </div>
              <span className="text-zinc-200">
                2. Role para baixo e toque em <strong>&ldquo;Adicionar à Tela de Início&rdquo;</strong>.
              </span>
            </div>
          </div>

          <Button
            onClick={() => setShowIOSModal(false)}
            data-testid="btn-close-ios-install"
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold shadow-lg shadow-orange-500/20 mt-1"
          >
            Entendi
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
