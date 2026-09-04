/**
 * @file audio-alerts.ts
 * @description Gerador de alertas sonoros sintetizados via Web Audio API (sem dependência de arquivos de áudio externos).
 */

export class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("acelera_sound_muted");
        if (stored !== null) {
          this.isMuted = stored === "true";
        }
      } catch {
        // Silencioso em caso de restrição de storage
      }
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;

    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }

      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }

      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * Desbloqueia o contexto de áudio após a primeira interação do usuário na tela (contorna restrição de autoplay).
   */
  public unlockAudio(): void {
    const ctx = this.getContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("acelera_sound_muted", muted ? "true" : "false");
        window.dispatchEvent(new CustomEvent("acelera:sound-mute-changed", { detail: { isMuted: muted } }));
      } catch {}
    }
  }

  public getMuted(): boolean {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("acelera_sound_muted");
        if (stored !== null) {
          return stored === "true";
        }
      } catch {}
    }
    return this.isMuted;
  }

  /**
   * Som agradável de novo lead (Chime de 2 notas: Dó -> Sol / D5 -> A5).
   */
  public playNewLeadSound(): void {
    if (this.getMuted()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Nota 1: D5 (587.33 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Nota 2: A5 (880.00 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.35, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);
    } catch {
      // Ignora falhas de áudio graciosamente
    }
  }

  /**
   * Som de Alerta Urgente (SLA Estourado - Beep duplo de aviso).
   */
  public playSlaBreachSound(): void {
    if (this.getMuted()) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const delays = [0, 0.18];

      delays.forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, now + delay); // A4
        gain.gain.setValueAtTime(0.25, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.12);
      });
    } catch {
      // Ignora falhas de áudio graciosamente
    }
  }
}

export const soundManager = new SoundManager();
