import { carById } from "../shared/catalog.js";
import { TurboAudioSynth } from "./audioSynth.js";
import type { Racer, TurboState } from "./model.js";

interface AudioMemory {
  phase: TurboState["phase"];
  countdown: number;
  coins: number;
  item: Racer["item"];
  boost: number;
  driftTier: Racer["driftTier"];
  drafting: boolean;
  spin: number;
  scraping: boolean;
  rescue: number;
  finished: boolean;
  speed: number;
}
export class AudioDirector {
  readonly #synth = new TurboAudioSynth();
  readonly #button: HTMLButtonElement;
  #memory: AudioMemory | null = null;
  #wrongWayAt = 0;
  readonly #timers = new Set<number>();
  readonly #unlock = () => void this.#synth.unlock();
  constructor(button: HTMLButtonElement) {
    this.#button = button;
    this.#renderButton();
    button.addEventListener("click", this.#toggle);
    window.addEventListener("pointerdown", this.#unlock, { passive: true });
    window.addEventListener("keydown", this.#unlock);
  }
  sync(state: TurboState, racer: Racer, now: number) {
    const step = Math.max(0, Math.ceil(state.countdownMs / 1000)),
      previous = this.#memory;
    this.#synth.updateEngine(
      racer.speed / Math.max(1, carById(racer.carId).topSpeed),
      state.phase === "racing" && !state.paused,
    );
    if (previous) {
      if (state.phase === "countdown" && step > 0 && step !== previous.countdown)
        this.#synth.countdown();
      if (previous.phase === "countdown" && state.phase === "racing") this.#synth.countdown(true);
      if (racer.coins > previous.coins) this.#synth.coin();
      if (racer.item && !previous.item) {
        this.#synth.itemBox();
        this.#roulette();
      }
      if (previous.item && !racer.item) this.#itemUsed(previous.item);
      if (racer.boostTimer > 0 && previous.boost <= 0)
        previous.drafting ? this.#synth.slipstream() : this.#synth.boost();
      if (racer.driftTier > previous.driftTier) this.#synth.driftSpark(racer.driftTier === 2);
      if (racer.spinTimer > 0 && previous.spin <= 0) {
        this.#synth.crash();
        this.#synth.spin();
      }
      if (racer.scraping && !previous.scraping)
        previous.speed - racer.speed > 4 ? this.#synth.wallHit() : this.#synth.scrape();
      if (racer.rescueCooldown > 2 && previous.rescue < 0.3) this.#synth.rescue();
      if (racer.finished && !previous.finished) this.#synth.finish();
    }
    if (racer.wrongWay && (now - this.#wrongWayAt > 1300 || !this.#wrongWayAt)) {
      this.#synth.wrongWay();
      this.#wrongWayAt = now;
    }
    if (!racer.wrongWay) this.#wrongWayAt = 0;
    this.#memory = {
      phase: state.phase,
      countdown: step,
      coins: racer.coins,
      item: racer.item,
      boost: racer.boostTimer,
      driftTier: racer.driftTier,
      drafting: racer.drafting,
      spin: racer.spinTimer,
      scraping: racer.scraping,
      rescue: racer.rescueCooldown,
      finished: racer.finished,
      speed: racer.speed,
    };
  }
  reset() {
    this.#clearTimers();
    this.#memory = null;
    this.#wrongWayAt = 0;
    this.#synth.stopEngine();
  }
  dispose() {
    this.#clearTimers();
    this.#button.removeEventListener("click", this.#toggle);
    window.removeEventListener("pointerdown", this.#unlock);
    window.removeEventListener("keydown", this.#unlock);
    void this.#synth.dispose();
  }
  #itemUsed(item: NonNullable<Racer["item"]>) {
    if (item === "PULSE") this.#synth.pulseFire();
    else if (item === "MINE") this.#synth.mineDrop();
  }
  #roulette() {
    for (let index = 1; index <= 4; index++) {
      const timer = window.setTimeout(() => {
        this.#timers.delete(timer);
        this.#synth.rouletteTick();
      }, index * 70);
      this.#timers.add(timer);
    }
  }
  #clearTimers() {
    for (const timer of this.#timers) window.clearTimeout(timer);
    this.#timers.clear();
  }
  readonly #toggle = () => {
    void this.#synth.setEnabled(!this.#synth.enabled).then(() => this.#renderButton());
  };
  #renderButton() {
    this.#button.textContent = this.#synth.enabled ? "SOUND ON" : "SOUND OFF";
    this.#button.dataset.enabled = String(this.#synth.enabled);
  }
}
