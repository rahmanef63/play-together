import type { RuntimeTelemetry } from "@play-together/contracts";

const MAX_SAMPLES = 300;
const SAMPLE_EVERY_FRAMES = 4;

export class FramePerformanceSampler {
  readonly #samples: number[] = [];
  #animationFrame = 0;
  #frameCounter = 0;
  #lastFrameAt = 0;
  #writeIndex = 0;
  #stopped = false;

  constructor() {
    this.#animationFrame = requestAnimationFrame((timestamp) => this.#tick(timestamp));
  }

  snapshot(rttMs: number | null): RuntimeTelemetry | undefined {
    if (this.#samples.length === 0) return undefined;
    const sorted = [...this.#samples].sort((left, right) => left - right);
    const p95Index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
    const frameP95Ms = sorted[p95Index] ?? 0;
    const frameMaxMs = sorted.at(-1) ?? 0;
    const frameSamples = sorted.length;
    this.#samples.length = 0;
    this.#writeIndex = 0;
    return {
      frameP95Ms: round(frameP95Ms),
      frameMaxMs: round(frameMaxMs),
      frameSamples,
      ...(rttMs === null ? {} : { rttMs: round(rttMs) }),
    };
  }

  stop(): void {
    this.#stopped = true;
    cancelAnimationFrame(this.#animationFrame);
  }

  #tick(timestamp: number): void {
    if (this.#stopped) return;
    if (
      this.#lastFrameAt > 0 &&
      document.visibilityState === "visible" &&
      this.#frameCounter++ % SAMPLE_EVERY_FRAMES === 0
    ) {
      const elapsed = Math.min(5_000, Math.max(0, timestamp - this.#lastFrameAt));
      if (this.#samples.length < MAX_SAMPLES) this.#samples.push(elapsed);
      else {
        this.#samples[this.#writeIndex] = elapsed;
        this.#writeIndex = (this.#writeIndex + 1) % MAX_SAMPLES;
      }
    }
    this.#lastFrameAt = timestamp;
    this.#animationFrame = requestAnimationFrame((next) => this.#tick(next));
  }
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
