import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { discoverGames } from "./discover-games.mjs";
import { captureGame } from "./game-previews/capture.mjs";
import { createPreviewHarness } from "./game-previews/harness.mjs";

const root = process.cwd();
const output = resolve(root, "apps/web/public/game-previews");
await mkdir(output, { recursive: true });
const selected = process.env.PREVIEW_GAME_ID?.trim();
const games = (await discoverGames(root)).filter((game) => !selected || game.id === selected);
if (!games.length) throw new Error("No matching game for preview capture");
const harness = await createPreviewHarness(root);
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const results = [];
try {
  for (const game of games) results.push(await captureGame(browser, harness.origin, game, output));
  let previous = [];
  if (selected) {
    try {
      previous = JSON.parse(await readFile(resolve(output, "index.json"), "utf8")).games;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const catalog = new Map(previous.map((game) => [game.gameId, game]));
  for (const result of results) catalog.set(result.gameId, result);
  await writeFile(
    resolve(output, "index.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        games: [...catalog.values()].sort((a, b) => a.gameId.localeCompare(b.gameId)),
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
  await harness.server.close();
}
