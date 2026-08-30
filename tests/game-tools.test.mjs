import { spawn } from "node:child_process";
import readline from "node:readline";
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
    expect(pong.currentVersionPublished).toBe(true);
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
