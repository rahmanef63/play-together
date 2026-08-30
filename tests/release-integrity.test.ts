import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gameManifestSchema } from "@play-together/contracts";
import { describe, expect, it } from "vitest";

describe("published game releases", () => {
  it("pins every executable entry by SHA-256 and catalogs every discovered game", async () => {
    const catalog = JSON.parse(
      await readFile(resolve("releases/game-cdn/catalog.json"), "utf8"),
    ) as {
      games: Array<{
        gameId: string;
        version: string;
        manifestPath: string;
        manifestSha256: string;
      }>;
    };
    expect(catalog.games.length).toBeGreaterThanOrEqual(2);
    const identities = new Set<string>();
    for (const release of catalog.games) {
      const identity = `${release.gameId}@${release.version}`;
      expect(identities.has(identity)).toBe(false);
      identities.add(identity);
      const releaseRoot = resolve("releases/game-cdn", `.${release.manifestPath}`, "..");
      const manifestBytes = await readFile(resolve(releaseRoot, "manifest.json"));
      expect(createHash("sha256").update(manifestBytes).digest("hex")).toBe(release.manifestSha256);
      const rawManifest = JSON.parse(manifestBytes.toString("utf8")) as Record<string, unknown>;
      expect(rawManifest.presentation).toBeUndefined();
      const manifest = gameManifestSchema.parse(rawManifest);
      expect(`${manifest.game.id}@${manifest.game.version}`).toBe(identity);
      for (const entry of Object.values(manifest.entries)) {
        if (!entry) continue;
        const bytes = await readFile(resolve(releaseRoot, entry.url));
        const digest = createHash("sha256").update(bytes).digest("hex");
        expect(digest).toBe(entry.sha256);
      }
    }
    expect([...identities]).toContain("pong@0.1.0");
    expect([...identities]).toContain("pong@0.2.0");
    expect([...identities]).toContain("tap-race@0.1.0");
    expect([...identities]).toContain("tap-race@0.2.0");
    const pongReleases = catalog.games.filter((release) => release.gameId === "pong");
    expect(
      new Set(pongReleases.map((release) => release.manifestSha256)).size,
    ).toBeGreaterThanOrEqual(2);
  });
});
