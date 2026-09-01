import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const adminUrl = pathToFileURL(resolve("scripts/game-admin.mjs")).href;

async function runPolicy(tempRoot, input) {
  const script = `
    import { runGameTool } from ${JSON.stringify(adminUrl)};
    const result = await runGameTool("release-status", ${JSON.stringify(input)});
    console.log(JSON.stringify(result));
  `;
  const { spawnSync } = await import("node:child_process");
  return spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: tempRoot,
    encoding: "utf8",
  });
}

describe("game release status tool", () => {
  it("retires immutable host policy without modifying release bytes", async () => {
    const root = await mkdtemp(join(tmpdir(), "play-together-release-policy-"));
    try {
      const releaseRoot = join(root, "releases", "game-cdn");
      await mkdir(releaseRoot, { recursive: true });
      await writeFile(
        join(releaseRoot, "catalog.json"),
        `${JSON.stringify({ schemaVersion: 1, games: [{ gameId: "demo-game", version: "1.2.3", manifestSha256: "abc" }] }, null, 2)}\n`,
      );
      const result = await runPolicy(root, {
        id: "demo-game",
        version: "1.2.3",
        status: "retired",
        reason: "Superseded by a verified release",
      });
      expect(result.status).toBe(0);
      const catalog = JSON.parse(await readFile(join(releaseRoot, "catalog.json"), "utf8"));
      expect(catalog.games[0]).toMatchObject({
        status: "retired",
        retirementReason: "Superseded by a verified release",
        manifestSha256: "abc",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("requires an operational reason for non-active states", async () => {
    const root = await mkdtemp(join(tmpdir(), "play-together-release-policy-"));
    try {
      await mkdir(join(root, "releases", "game-cdn"), { recursive: true });
      await writeFile(
        join(root, "releases", "game-cdn", "catalog.json"),
        JSON.stringify({ schemaVersion: 1, games: [{ gameId: "demo-game", version: "1.2.3" }] }),
      );
      const result = await runPolicy(root, {
        id: "demo-game",
        version: "1.2.3",
        status: "blocked",
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/reason must be/i);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
