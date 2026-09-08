import { spawnSync } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("rejects invalid controller metadata before creating release bytes or a catalog entry", async () => {
  const temporary = await mkdtemp(resolve(tmpdir(), "manifest-gate-"));
  try {
    const manifest = JSON.parse(
      await readFile(resolve("games/turbo-circuit/dist/manifest.json"), "utf8"),
    );
    manifest.controller.console.controls[2].ariaLabel = "x".repeat(81);
    const game = resolve(temporary, "games/turbo-circuit");
    await mkdir(resolve(game, "dist"), { recursive: true });
    await mkdir(resolve(temporary, "bin"));
    await writeFile(resolve(game, "game.config.json"), JSON.stringify({ game: manifest.game }));
    await writeFile(resolve(game, "dist/manifest.json"), JSON.stringify(manifest));
    // Fixture already contains its build output; isolate the external build command.
    await writeFile(resolve(temporary, "bin/pnpm"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
    const result = spawnSync(
      process.execPath,
      [resolve("scripts/publish-game.mjs"), "turbo-circuit"],
      {
        cwd: temporary,
        encoding: "utf8",
        env: { ...process.env, PATH: resolve(temporary, "bin") + ":" + process.env.PATH },
      },
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("ariaLabel");
    expect(
      await access(resolve(temporary, "releases/game-cdn")).then(
        () => true,
        () => false,
      ),
    ).toBe(false);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
