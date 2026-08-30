import { runGameTool } from "./game-admin.mjs";

const action = process.argv[2];
if (!action) throw new Error("Usage: node scripts/game-tool.mjs <action>");

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
const input = raw.trim() ? JSON.parse(raw) : {};

try {
  const result = await runGameTool(action, input);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  const message = error instanceof Error ? error.message : "Game tool failed";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
