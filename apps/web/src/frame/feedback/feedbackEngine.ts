export type FeedbackCue = "control" | "success" | "warning" | "impact" | "finish" | "error";

const COOLDOWN_MS: Record<FeedbackCue, number> = {
  control: 35,
  success: 90,
  warning: 160,
  impact: 100,
  finish: 450,
  error: 220,
};

const VIBRATION: Record<FeedbackCue, number | number[]> = {
  control: 8,
  success: [12, 20, 18],
  warning: [18, 28, 18],
  impact: 28,
  finish: [18, 28, 28, 32, 44],
  error: [34, 26, 34],
};

const TONES: Record<FeedbackCue, readonly [number, number, number]> = {
  control: [260, 0.018, 0.018],
  success: [520, 0.045, 0.045],
  warning: [330, 0.06, 0.035],
  impact: [150, 0.045, 0.05],
  finish: [660, 0.12, 0.05],
  error: [110, 0.08, 0.045],
};

export class GameFeedbackEngine {
  #audio: AudioContext | null = null;
  #unlocked = false;
  readonly #lastAt = new Map<FeedbackCue, number>();

  unlock(): void {
    this.#unlocked = true;
    const audio = this.#audioContext();
    if (audio?.state === "suspended") void audio.resume().catch(() => undefined);
  }

  cue(cue: FeedbackCue): void {
    const now = performance.now();
    if (now - (this.#lastAt.get(cue) ?? -Infinity) < COOLDOWN_MS[cue]) return;
    this.#lastAt.set(cue, now);
    this.#vibrate(cue);
    this.#tone(cue);
  }

  stop(): void {
    if (this.#canVibrate()) {
      try {
        navigator.vibrate(0);
      } catch {
        // Haptics are optional and must never interrupt teardown.
      }
    }
    if (!this.#audio) return;
    void this.#audio.close().catch(() => undefined);
    this.#audio = null;
  }

  #canVibrate(): boolean {
    if (!this.#unlocked || typeof navigator === "undefined" || !("vibrate" in navigator)) {
      return false;
    }
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
      .userActivation;
    return activation?.hasBeenActive ?? true;
  }

  #vibrate(cue: FeedbackCue): void {
    if (!this.#canVibrate()) return;
    try {
      navigator.vibrate(VIBRATION[cue]);
    } catch {
      // Haptics are optional and must never interrupt gameplay.
    }
  }

  #tone(cue: FeedbackCue): void {
    if (!this.#unlocked) return;
    const audio = this.#audioContext();
    if (!audio || audio.state === "closed") return;
    const [frequency, duration, gainValue] = TONES[cue];
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = cue === "impact" || cue === "error" ? "square" : "sine";
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
    gain.gain.setValueAtTime(gainValue, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  }

  #audioContext(): AudioContext | null {
    if (this.#audio) return this.#audio;
    if (typeof window === "undefined") return null;
    const Constructor = window.AudioContext;
    if (!Constructor) return null;
    try {
      this.#audio = new Constructor({ latencyHint: "interactive" });
      return this.#audio;
    } catch {
      return null;
    }
  }
}

export const gameFeedback = new GameFeedbackEngine();
