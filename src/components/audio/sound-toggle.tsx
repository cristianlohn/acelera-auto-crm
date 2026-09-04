/**
 * @file sound-toggle.tsx
 * @description Botão de controle de áudio (Mudo / Ativado) para notificações e alertas do CRM.
 */

"use client";

import React, { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { soundManager } from "@/lib/utils/audio-alerts";
import { cn } from "@/lib/utils";

export interface SoundToggleProps {
  className?: string;
  showLabel?: boolean;
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm";
}

export function SoundToggle({
  className,
  showLabel = false,
  size = "icon-sm",
}: SoundToggleProps) {
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

  const handleToggle = () => {
    const nextState = !isMuted;
    soundManager.setMuted(nextState);
    setIsMuted(nextState);
    if (!nextState) {
      soundManager.playNewLeadSound();
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      onClick={handleToggle}
      data-testid="btn-sound-toggle"
      aria-label={isMuted ? "Ativar alertas sonoros" : "Mutar alertas sonoros"}
      title={isMuted ? "Alertas sonoros desativados (clique para ativar)" : "Alertas sonoros ativados (clique para mutar)"}
      className={cn(
        "h-9 transition-colors text-muted-foreground hover:text-foreground",
        showLabel && "px-3 gap-2",
        className
      )}
    >
      {isMuted ? (
        <VolumeX className="h-4 w-4 text-red-400" />
      ) : (
        <Volume2 className="h-4 w-4 text-emerald-400" />
      )}
      {showLabel && (
        <span className="text-xs font-medium">
          {isMuted ? "Som Desativado" : "Som Ativado"}
        </span>
      )}
    </Button>
  );
}
