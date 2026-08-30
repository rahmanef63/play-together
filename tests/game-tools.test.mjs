import { spawn, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import readline from "node:readline";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { runGameTool } from "../scripts/game-admin.mjs";
import { GAME_TOOL_DEFINITIONS } from "../scripts/game-tool-definitions.mjs";

describe("game project tools", () => {
  it("lists and reads games without duplicating portal discovery", async () => {
    const result = await runGameTool("list", {});
    expect(result.count).toBe(15);
    expect(result.games.some((game) => game.id === "pong" && game.published)).toBe(true);
    const pong = await runGameTool("get", { id: "pong" });
    expect(pong.config.game.id).toBe("pong");
    expect(pong.config.presentation.remoteDisplay).toEqual({ mode: "shared", maxViewports: 1 });
    expect(pong.currentVersionPublished).toBe(true);
    const racing = result.games.find((game) => game.id === "turbo-circuit");
    expect(racing?.remoteDisplay).toBe("per-player");
    expect(racing?.maxViewports).toBe(4);
  });

  it("refuses byte-changing updates and deletion of published game history", async () => {
    const pong = await runGameTool("get", { id: "pong" });
    await expect(
      runGameTool("update", {
        id: "pong",
        expectedVersion: pong.config.game.version,
        title: "This must never be written",
      }),
    ).rejects.toThrow(/published and immutable/i);
    await expect(runGameTool("delete", { id: "pong" })).rejects.toThrow(/cannot be deleted/i);
    const after = await runGameTool("get", { id: "pong" });
    expect(after.config.game.title).toBe(pong.config.game.title);
  });

  it("revalidates per-player presentation before writing changed player limits", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "play-together-game-tool-"));
    const gameId = "remote-policy-smoke";
    const gameRoot = join(tempRoot, "games", gameId);
    try {
      await mkdir(gameRoot, { recursive: true });
      await mkdir(join(tempRoot, "releases", "game-cdn"), { recursive: true });
      const config = {
        schemaVersion: 1,
        protocolVersion: 1,
        game: {
          id: gameId,
          version: "0.1.0",
          title: "Remote Policy Smoke",
          description: "Isolated temporary config for validating presentation guards.",
          minPlayers: 1,
          maxPlayers: 4,
          tickRate: 30,
          snapshotRate: 15,
        },
        modes: ["shared-screen", "handheld"],
        presentation: { remoteDisplay: { mode: "per-player", maxViewports: 4 } },
        controller: {
          supportsRemote: true,
          supportsHandheld: true,
          preferredOrientation: "adaptive",
          console: { renderer: "builtin", layout: "racing", controls: [] },
        },
        capabilities: { touch: true, keyboard: true, gamepad: false, motion: false },
      };
      await writeFile(join(gameRoot, "game.config.json"), `${JSON.stringify(config, null, 2)}\n`);
      await writeFile(
        join(gameRoot, "package.json"),
        `${JSON.stringify({ name: `@play-together/game-${gameId}`, version: "0.1.0" }, null, 2)}\n`,
      );
      await writeFile(
        join(tempRoot, "releases", "game-cdn", "catalog.json"),
        `${JSON.stringify({ games: [] }, null, 2)}\n`,
      );

      const adminUrl = pathToFileURL(resolve("scripts/game-admin.mjs")).href;
      const script = `
        import { runGameTool } from ${JSON.stringify(adminUrl)};
        try {
          await runGameTool("update", {
            id: ${JSON.stringify(gameId)},
            expectedVersion: "0.1.0",
            maxPlayers: 1
          });
          process.exitCode = 2;
        } catch (error) {
          console.log(error instanceof Error ? error.message : String(error));
        }
      `;
      const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
        cwd: tempRoot,
        encoding: "utf8",
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/per-player remote display requires maxPlayers >= 2/i);
      const after = JSON.parse(await readFile(join(gameRoot, "game.config.json"), "utf8"));
      expect(after.game.maxPlayers).toBe(4);
      expect(after.presentation.remoteDisplay).toEqual({ mode: "per-player", maxViewports: 4 });
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("returns the canonical submission prompt", async () => {
    const result = await runGameTool("prompt", {});
    expect(result.prompt).toContain("You are adding one new multiplayer game");
    expect(result.prompt).toContain("game_publish");
    expect(result.prompt).toContain("deploy-managed");
  });

  it("serves the same bounded tools over stdio MCP", async () => {
    const child = spawn(process.execPath, ["scripts/game-mcp-server.mjs"], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });
    const lines = readline.createInterface({ input: child.stdout });
    const responses = new Map();
    lines.on("line", (line) => {
      const response = JSON.parse(line);
      responses.set(response.id, response);
    });
    const call = async (request) => {
      child.stdin.write(`${JSON.stringify(request)}\n`);
      const deadline = Date.now() + 4_000;
      while (Date.now() < deadline) {
        if (responses.has(request.id)) return responses.get(request.id);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      throw new Error(`Timed out waiting for MCP response ${request.id}`);
    };
    try {
      const initialized = await call({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "test", version: "1" },
        },
      });
      expect(initialized.result.serverInfo.name).toBe("play-together-games");
      const listed = await call({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
      expect(listed.result.tools).toHaveLength(GAME_TOOL_DEFINITIONS.length);
      expect(listed.result.tools.map((tool) => tool.name)).toContain("game_create");
      const updateTool = listed.result.tools.find((tool) => tool.name === "game_update");
      expect(updateTool.inputSchema.properties.remoteDisplay.enum).toEqual([
        "shared",
        "per-player",
      ]);
      expect(updateTool.inputSchema.properties.maxViewports.maximum).toBe(4);
      const fetched = await call({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "game_get", arguments: { id: "pong" } },
      });
      expect(fetched.result.isError).toBe(false);
      expect(fetched.result.structuredContent.id).toBe("pong");
    } finally {
      child.kill("SIGTERM");
      lines.close();
    }
  });
});
