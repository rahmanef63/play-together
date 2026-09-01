import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { GAME_TOOL_DEFINITIONS } from "../scripts/game-tool-definitions.mjs";

describe("generated game tool catalog", () => {
  it("keeps the Developers UI in sync with the bounded MCP/MSO tool definitions", async () => {
    const catalog = JSON.parse(await readFile("apps/web/src/generated/gameTools.json", "utf8"));
    expect(catalog.tools.map((tool) => tool.name)).toEqual(
      GAME_TOOL_DEFINITIONS.map((tool) => tool.mcpName),
    );
    expect(catalog.tools).toHaveLength(10);
  });
});
