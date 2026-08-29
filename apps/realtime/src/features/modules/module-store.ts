import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { type GameManifest, gameManifestSchema, type TicketClaims } from "@play-together/contracts";

export interface ResolvedGameModule {
  manifest: GameManifest;
  modulePath: string;
}

export class GameModuleStore {
  readonly #cacheDirectory: string;
  readonly #allowedOrigins: ReadonlySet<string>;
  readonly #originMap: ReadonlyMap<string, string>;
  readonly #allowInsecureOrigins: boolean;
  readonly #inFlight = new Map<string, Promise<ResolvedGameModule>>();

  constructor(
    cacheDirectory: string,
    allowedOrigins: ReadonlySet<string>,
    originMap: ReadonlyMap<string, string> = new Map(),
    allowInsecureOrigins = false,
  ) {
    this.#cacheDirectory = cacheDirectory;
    this.#allowedOrigins = allowedOrigins;
    this.#originMap = originMap;
    this.#allowInsecureOrigins = allowInsecureOrigins;
  }

  resolve(claims: TicketClaims): Promise<ResolvedGameModule> {
    const key = `${claims.gameId}@${claims.gameVersion}:${claims.manifestSha256}`;
    const existing = this.#inFlight.get(key);
    if (existing) return existing;
    const request = this.#resolve(claims).finally(() => this.#inFlight.delete(key));
    this.#inFlight.set(key, request);
    return request;
  }

  async #resolve(claims: TicketClaims): Promise<ResolvedGameModule> {
    this.#assertAllowed(claims.manifestUrl);
    const manifestBytes = await this.#download(claims.manifestUrl, 1_000_000);
    this.#assertDigest(manifestBytes, claims.manifestSha256, "manifest");
    const manifest = gameManifestSchema.parse(JSON.parse(manifestBytes.toString("utf8")));
    if (manifest.game.id !== claims.gameId || manifest.game.version !== claims.gameVersion) {
      throw new Error("Ticket and game manifest do not identify the same immutable version");
    }
    const moduleUrl = new URL(manifest.entries.server.url, claims.manifestUrl).toString();
    this.#assertAllowed(moduleUrl);
    const moduleBytes = await this.#download(moduleUrl, 12_000_000);
    this.#assertDigest(moduleBytes, manifest.entries.server.sha256, "server module");
    await mkdir(this.#cacheDirectory, { recursive: true, mode: 0o700 });
    const modulePath = resolve(this.#cacheDirectory, `${manifest.entries.server.sha256}.mjs`);
    try {
      const cached = await readFile(modulePath);
      this.#assertDigest(cached, manifest.entries.server.sha256, "cached server module");
    } catch {
      const temporary = `${modulePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
      await writeFile(temporary, moduleBytes, { mode: 0o600 });
      await rename(temporary, modulePath);
    }
    return { manifest, modulePath };
  }

  #assertAllowed(value: string): void {
    const url = new URL(value);
    if (!this.#allowedOrigins.has(url.origin)) {
      throw new Error(`Game module origin is not allowed: ${url.origin}`);
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("Only HTTP(S) game modules are supported");
    }
    if (url.protocol !== "https:" && !this.#allowInsecureOrigins) {
      throw new Error("Game modules require HTTPS outside local development");
    }
  }

  async #download(url: string, maxBytes: number): Promise<Buffer> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(this.#fetchUrl(url), {
        signal: controller.signal,
        redirect: "error",
        headers: { accept: "application/json, text/javascript;q=0.9" },
      });
      if (!response.ok) throw new Error(`Game asset request failed (${response.status})`);
      const declaredSize = Number(response.headers.get("content-length") ?? 0);
      if (declaredSize > maxBytes) throw new Error("Game asset exceeds size policy");
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.byteLength > maxBytes) throw new Error("Game asset exceeds size policy");
      return bytes;
    } finally {
      clearTimeout(timeout);
    }
  }

  #fetchUrl(value: string): string {
    const url = new URL(value);
    const replacement = this.#originMap.get(url.origin);
    if (!replacement) return url.toString();
    const internal = new URL(replacement);
    internal.pathname = url.pathname;
    internal.search = url.search;
    return internal.toString();
  }

  #assertDigest(bytes: Buffer, expected: string, label: string): void {
    const actual = createHash("sha256").update(bytes).digest("hex");
    if (actual !== expected.toLowerCase()) throw new Error(`${label} integrity check failed`);
  }
}
