import readline from "node:readline";
import { runGameTool } from "./game-admin.mjs";
import { GAME_TOOL_DEFINITIONS } from "./game-tool-definitions.mjs";

const SERVER_INFO = { name: "play-together-games", version: "1.0.0" };
const tools = new Map(GAME_TOOL_DEFINITIONS.map((tool) => [tool.mcpName, tool]));
const lines = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

for await (const line of lines) {
  if (!line.trim()) continue;
  let request;
  try {
    request = JSON.parse(line);
  } catch {
    writeError(null, -32700, "Parse error");
    continue;
  }
  if (request?.jsonrpc !== "2.0" || typeof request.method !== "string") {
    writeError(request?.id ?? null, -32600, "Invalid Request");
    continue;
  }
  if (request.id === undefined) continue;
  try {
    if (request.method === "initialize") {
      writeResult(request.id, {
        protocolVersion: request.params?.protocolVersion ?? "2025-06-18",
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      });
      continue;
    }
    if (request.method === "ping") {
      writeResult(request.id, {});
      continue;
    }
    if (request.method === "tools/list") {
      writeResult(request.id, {
        tools: GAME_TOOL_DEFINITIONS.map((tool) => ({
          name: tool.mcpName,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      });
      continue;
    }
    if (request.method === "tools/call") {
      const name = request.params?.name;
      const definition = typeof name === "string" ? tools.get(name) : undefined;
      if (!definition) throw new Error(`Unknown tool: ${String(name)}`);
      try {
        const value = await runGameTool(definition.action, request.params?.arguments ?? {});
        writeResult(request.id, {
          content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
          structuredContent: value,
          isError: false,
        });
      } catch (error) {
        writeResult(request.id, {
          content: [
            { type: "text", text: error instanceof Error ? error.message : "Game tool failed" },
          ],
          isError: true,
        });
      }
      continue;
    }
    writeError(request.id, -32601, `Method not found: ${request.method}`);
  } catch (error) {
    writeError(request.id, -32603, error instanceof Error ? error.message : "Internal error");
  }
}

function writeResult(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
}

function writeError(id, code, message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } })}\n`);
}
