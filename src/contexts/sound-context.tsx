/**
 * @file sound-context.tsx
 * @description Provider e Hook Reativo de Controle de Sons e Alertas do CRM.
 */

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { soundManager, SoundManager } from "@/lib/sound/sound-manager";

export interface SoundContextType {
  isMuted: boolean;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  playNewLead: () => void;
  playSlaAlert: () => void;
  soundManager: SoundManager;
}

const SoundContext = createContext<SoundContextType | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState<boolean>(() => soundManager.getMuted());

  useEffect(() => {
    const handleMuteChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ isMuted: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.isMuted === "boolean") {
        setIsMuted(customEvent.detail.isMuted);
      } else {
        setIsMuted(soundManager.getMuted());
      }
    };

    window.addEventListener("acelera:sound-mute-changed", handleMuteChange);
    return () => {
      window.removeEventListener("acelera:sound-mute-changed", handleMuteChange);
    };
  }, []);

  // Desbloqueia o AudioContext na primeira interação do usuário (click, keydown, touchstart)
  useEffect(() => {
    const handleFirstInteraction = () => {
      soundManager.unlockAudio();
    };

    window.addEventListener("click", handleFirstInteraction, { once: true, passive: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true, passive: true });
    window.addEventListener("touchstart", handleFirstInteraction, { once: true, passive: true });

    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    soundManager.setMuted(muted);
    setIsMuted(muted);
  }, []);

  const toggleMute = useCallback(() => {
    const nextState = !soundManager.getMuted();
    soundManager.setMuted(nextState);
    setIsMuted(nextState);
    if (!nextState) {
      soundManager.playNewLeadSound();
    }
  }, []);

  const playNewLead = useCallback(() => {
    soundManager.playNewLeadSound();
  }, []);

  const playSlaAlert = useCallback(() => {
    soundManager.playSlaAlertSound();
  }, []);

  return (
    <SoundContext.Provider
      value={{
        isMuted,
        toggleMute,
        setMuted,
        playNewLead,
        playSlaAlert,
        soundManager,
      }}
    >
      {children}
    </SoundContext.Provider>
  );
}

export function useSound(): SoundContextType {
  const context = useContext(SoundContext);
  if (!context) {
    // Fallback gracioso caso utilizado fora da árvore do provider
    return {
      isMuted: soundManager.getMuted(),
      toggleMute: () => {
        const next = !soundManager.getMuted();
        soundManager.setMuted(next);
        if (!next) soundManager.playNewLeadSound();
      },
      setMuted: (muted: boolean) => soundManager.setMuted(muted),
      playNewLead: () => soundManager.playNewLeadSound(),
      playSlaAlert: () => soundManager.playSlaAlertSound(),
      soundManager,
    };
  }
  return context;
}
