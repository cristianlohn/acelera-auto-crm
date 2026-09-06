/**
 * @file sound-manager.ts
 * @description Gerador de notificações e alertas sonoros com Web Audio API sintetizada nativamente (zero dependência de arquivos .mp3 externos).
 */

export class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("acelera_sound_muted");
        this.isMuted = saved === "true";
      } catch {
        this.isMuted = false;
      }
    }
  }

  private getAudioContext(): AudioContext | null {
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
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("acelera_sound_muted", String(muted));
        window.dispatchEvent(
          new CustomEvent("acelera:sound-mute-changed", { detail: { isMuted: muted } })
        );
      } catch {}
    }
  }

  public getMuted(): boolean {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("acelera_sound_muted");
        if (saved !== null) {
          return saved === "true";
        }
      } catch {}
    }
    return this.isMuted;
  }

  /**
   * Chime ascendente elegante de Novo Lead (Duplo tom: C5 -> G5)
   */
  public playNewLeadSound(): void {
    if (this.getMuted()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Primeiro tom (C5 - 523.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Segundo tom ascendente (G5 - 783.99 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(783.99, now + 0.12);
      gain2.gain.setValueAtTime(0.2, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.6);
    } catch {
      // Ignora falhas de áudio graciosamente
    }
  }

  /**
   * Alerta sutil de SLA Estourado (Atenção em Tom Menor: A4 -> F4)
   */
  public playSlaAlertSound(): void {
    if (this.getMuted()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(349.23, now + 0.25); // F4

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } catch {
      // Ignora falhas de áudio graciosamente
    }
  }

  /**
   * Alias de compatibilidade com implementações existentes
   */
  public playSlaBreachSound(): void {
    this.playSlaAlertSound();
  }
}

export const soundManager = new SoundManager();
