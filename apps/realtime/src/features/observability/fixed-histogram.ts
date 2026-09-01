export interface HistogramSummary {
  count: number;
  p50: number;
  p95: number;
  max: number;
}

export class FixedHistogram {
  readonly #bounds: readonly number[];
  readonly #counts: number[];
  #count = 0;
  #max = 0;

  constructor(bounds: readonly number[]) {
    if (bounds.length === 0) throw new Error("Histogram requires at least one bound");
    this.#bounds = [...bounds];
    this.#counts = Array.from({ length: bounds.length + 1 }, () => 0);
  }

  observe(value: number): void {
    if (!Number.isFinite(value) || value < 0) return;
    this.#count += 1;
    this.#max = Math.max(this.#max, value);
    const index = this.#bounds.findIndex((bound) => value <= bound);
    const bucket = index < 0 ? this.#bounds.length : index;
    this.#counts[bucket] = (this.#counts[bucket] ?? 0) + 1;
  }

  summary(): HistogramSummary {
    return {
      count: this.#count,
      p50: this.#percentile(0.5),
      p95: this.#percentile(0.95),
      max: round(this.#max),
    };
  }

  reset(): void {
    this.#count = 0;
    this.#max = 0;
    this.#counts.fill(0);
  }

  #percentile(fraction: number): number {
    if (this.#count === 0) return 0;
    const target = Math.max(1, Math.ceil(this.#count * fraction));
    let cumulative = 0;
    for (let index = 0; index < this.#counts.length; index += 1) {
      cumulative += this.#counts[index] ?? 0;
      if (cumulative >= target) return this.#bounds[index] ?? round(this.#max);
    }
    return round(this.#max);
  }
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
