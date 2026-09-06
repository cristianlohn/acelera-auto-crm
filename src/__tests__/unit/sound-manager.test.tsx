/**
 * @file sound-manager.test.tsx
 * @description Suíte de Testes Unitários para a Síntese Nativa de Áudio Web Audio API (SoundManager & useSound).
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { SoundManager } from "@/lib/sound/sound-manager";
import { SoundProvider, useSound } from "@/contexts/sound-context";

describe("[UNIT-SOUND-MANAGER] Síntese de Áudio Web Audio API & SoundManager", () => {
  let mockOscillator: {
    type: string;
    frequency: {
      setValueAtTime: ReturnType<typeof vi.fn>;
      exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
    };
    connect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  };

  let mockGain: {
    gain: {
      setValueAtTime: ReturnType<typeof vi.fn>;
      exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
    };
    connect: ReturnType<typeof vi.fn>;
  };

  let lastAudioContextInstance: {
    currentTime: number;
    state: AudioContextState;
    resume: ReturnType<typeof vi.fn>;
    createOscillator: ReturnType<typeof vi.fn>;
    createGain: ReturnType<typeof vi.fn>;
    destination: Record<string, unknown>;
  } | null = null;

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    lastAudioContextInstance = null;

    mockOscillator = {
      type: "sine",
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };

    class MockAudioContext {
      currentTime = 10.0;
      state: AudioContextState = "running";
      resume = vi.fn().mockResolvedValue(undefined);
      createOscillator = vi.fn().mockReturnValue(mockOscillator);
      createGain = vi.fn().mockReturnValue(mockGain);
      destination = {};

      constructor() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        lastAudioContextInstance = this;
      }
    }

    // @ts-expect-error Mock constructor
    window.AudioContext = MockAudioContext;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("[TEST-SOUND-1] deve inicializar desmutado por padrão e persistir toggle no localStorage", () => {
    const manager = new SoundManager();
    expect(manager.getMuted()).toBe(false);

    manager.setMuted(true);
    expect(manager.getMuted()).toBe(true);
    expect(localStorage.getItem("acelera_sound_muted")).toBe("true");

    manager.setMuted(false);
    expect(manager.getMuted()).toBe(false);
    expect(localStorage.getItem("acelera_sound_muted")).toBe("false");
  });

  it("[TEST-SOUND-2] deve inicializar mutado quando o localStorage contiver acelera_sound_muted=true", () => {
    localStorage.setItem("acelera_sound_muted", "true");
    const manager = new SoundManager();
    expect(manager.getMuted()).toBe(true);
  });

  it("[TEST-SOUND-3] deve desbloquear o AudioContext ao chamar unlockAudio()", () => {
    const manager = new SoundManager();
    manager.unlockAudio();

    expect(lastAudioContextInstance).not.toBeNull();
  });

  it("[TEST-SOUND-4] deve tocar som de novo lead com duplo tom C5 -> G5 (523.25 Hz -> 783.99 Hz)", () => {
    const manager = new SoundManager();
    manager.playNewLeadSound();

    expect(lastAudioContextInstance).not.toBeNull();
    expect(lastAudioContextInstance?.createOscillator).toHaveBeenCalledTimes(2);
    expect(lastAudioContextInstance?.createGain).toHaveBeenCalledTimes(2);

    // Primeiro tom C5 (523.25 Hz)
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(523.25, 10.0);
    // Segundo tom G5 (783.99 Hz)
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(783.99, 10.12);

    expect(mockOscillator.start).toHaveBeenCalledTimes(2);
    expect(mockOscillator.stop).toHaveBeenCalledTimes(2);
  });

  it("[TEST-SOUND-5] deve tocar som de alerta de SLA com tom menor (A4 -> F4: 440 Hz -> 349.23 Hz)", () => {
    const manager = new SoundManager();
    manager.playSlaAlertSound();

    expect(lastAudioContextInstance).not.toBeNull();
    expect(lastAudioContextInstance?.createOscillator).toHaveBeenCalledTimes(1);
    expect(lastAudioContextInstance?.createGain).toHaveBeenCalledTimes(1);

    expect(mockOscillator.type).toBe("triangle");
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(440, 10.0);
    expect(mockOscillator.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(349.23, 10.25);

    expect(mockOscillator.start).toHaveBeenCalledTimes(1);
    expect(mockOscillator.stop).toHaveBeenCalledTimes(1);
  });

  it("[TEST-SOUND-6] deve manter alias playSlaBreachSound compatível com playSlaAlertSound", () => {
    const manager = new SoundManager();
    const spy = vi.spyOn(manager, "playSlaAlertSound");
    manager.playSlaBreachSound();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("[TEST-SOUND-7] NÃO deve emitir áudio quando o SoundManager estiver mutado", () => {
    lastAudioContextInstance = null;
    const manager = new SoundManager();
    manager.setMuted(true);

    manager.playNewLeadSound();
    manager.playSlaAlertSound();

    expect(lastAudioContextInstance).toBeNull();
  });

  it("[TEST-SOUND-8] deve expor controles no hook useSound() e sincronizar com SoundProvider", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SoundProvider>{children}</SoundProvider>
    );

    const { result } = renderHook(() => useSound(), { wrapper });

    expect(result.current.isMuted).toBe(false);

    act(() => {
      result.current.toggleMute();
    });

    expect(result.current.isMuted).toBe(true);
    expect(localStorage.getItem("acelera_sound_muted")).toBe("true");

    act(() => {
      result.current.setMuted(false);
    });

    expect(result.current.isMuted).toBe(false);
    expect(localStorage.getItem("acelera_sound_muted")).toBe("false");
  });
});
