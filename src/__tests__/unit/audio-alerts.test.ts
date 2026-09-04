/**
 * @file audio-alerts.test.ts
 * @description Suíte de Testes Unitários para o Gerador de Áudio Sintetizado (Web Audio API) e SoundManager.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SoundManager } from "@/lib/utils/audio-alerts";

describe("[UNIT-AUDIO-ALERTS] Gerador de Sons e SoundManager (Web Audio API)", () => {
  let mockOscillator: {
    type: string;
    frequency: { setValueAtTime: ReturnType<typeof vi.fn> };
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
      frequency: { setValueAtTime: vi.fn() },
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

  it("deve inicializar com som desmutado por padrão e permitir mutar persistindo no localStorage", () => {
    const manager = new SoundManager();
    expect(manager.getMuted()).toBe(false);

    manager.setMuted(true);
    expect(manager.getMuted()).toBe(true);
    expect(localStorage.getItem("acelera_sound_muted")).toBe("true");

    manager.setMuted(false);
    expect(manager.getMuted()).toBe(false);
    expect(localStorage.getItem("acelera_sound_muted")).toBe("false");
  });

  it("deve desbloquear o AudioContext ao chamar unlockAudio()", () => {
    const manager = new SoundManager();
    manager.unlockAudio();

    expect(lastAudioContextInstance).not.toBeNull();
  });

  it("deve tocar som de novo lead (chime de 2 notas D5 -> A5) com Web Audio API", () => {
    const manager = new SoundManager();
    manager.playNewLeadSound();

    expect(lastAudioContextInstance).not.toBeNull();
    // Deve criar 2 osciladores (nota 1 e nota 2)
    expect(lastAudioContextInstance?.createOscillator).toHaveBeenCalledTimes(2);
    expect(lastAudioContextInstance?.createGain).toHaveBeenCalledTimes(2);

    // Frequências D5 (587.33) e A5 (880)
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(587.33, 10.0);
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(880, 10.12);

    // Conexões e início da reprodução
    expect(mockOscillator.start).toHaveBeenCalledTimes(2);
    expect(mockOscillator.stop).toHaveBeenCalledTimes(2);
  });

  it("deve tocar som de alerta urgente de SLA (beep duplo A4) com oscilador triangular", () => {
    const manager = new SoundManager();
    manager.playSlaBreachSound();

    expect(lastAudioContextInstance).not.toBeNull();
    // 2 pulsos
    expect(lastAudioContextInstance?.createOscillator).toHaveBeenCalledTimes(2);
    expect(lastAudioContextInstance?.createGain).toHaveBeenCalledTimes(2);
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(440, 10.0);
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(440, 10.18);
  });

  it("NÃO deve tocar som quando estiver mutado", () => {
    lastAudioContextInstance = null;
    const manager = new SoundManager();
    manager.setMuted(true);

    manager.playNewLeadSound();
    manager.playSlaBreachSound();

    expect(lastAudioContextInstance).toBeNull();
  });
});
