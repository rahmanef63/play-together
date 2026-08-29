export class TicketReplayGuard {
  readonly #seen = new Map<string, number>();
  readonly #maximumEntries: number;

  constructor(maximumEntries = 200_000) {
    this.#maximumEntries = maximumEntries;
  }

  consume(
    jti: string,
    expiresAtSeconds: number,
    nowSeconds = Math.floor(Date.now() / 1000),
  ): boolean {
    this.#purge(nowSeconds);
    const existingExpiration = this.#seen.get(jti);
    if (existingExpiration !== undefined && existingExpiration >= nowSeconds) return false;
    if (expiresAtSeconds < nowSeconds) return false;
    this.#seen.set(jti, expiresAtSeconds);
    while (this.#seen.size > this.#maximumEntries) {
      const oldest = this.#seen.keys().next().value as string | undefined;
      if (!oldest) break;
      this.#seen.delete(oldest);
    }
    return true;
  }

  #purge(nowSeconds: number): void {
    for (const [jti, expiration] of this.#seen) {
      if (expiration >= nowSeconds) continue;
      this.#seen.delete(jti);
    }
  }
}
