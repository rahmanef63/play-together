import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { GAME_TOOL_DEFINITIONS } from "./game-tool-definitions.mjs";

const root = process.cwd();
const manifest = {
  version: 1,
  functions: GAME_TOOL_DEFINITIONS.map((tool) => ({
    name: tool.msoName,
    description: tool.description,
    inputSchema: tool.inputSchema,
    command: ["node", "scripts/game-tool.mjs", tool.action],
    timeoutMs: ["create", "validate", "publish"].includes(tool.action)
      ? 30_000
      : ["update", "delete", "registry"].includes(tool.action)
        ? 15_000
        : 10_000,
  })),
};
await mkdir(resolve(root, ".mso"), { recursive: true });
await writeFile(resolve(root, ".mso/functions.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(
  resolve(root, ".mcp.json"),
  `${JSON.stringify(
    {
      mcpServers: {
        "play-together-games": {
          command: "node",
          args: ["scripts/game-mcp-server.mjs"],
        },
      },
    },
    null,
    2,
  )}\n`,
);
const format = spawnSync(
  "pnpm",
  ["exec", "biome", "format", "--write", ".mso/functions.json", ".mcp.json"],
  {
    cwd: root,
    encoding: "utf8",
  },
);
if (format.error) throw format.error;
if (format.status !== 0)
  throw new Error(
    `Failed to format generated game tool manifests: ${format.stderr || format.stdout}`,
  );
console.log(`Synced ${GAME_TOOL_DEFINITIONS.length} game tools to MCP and MSO manifests`);
