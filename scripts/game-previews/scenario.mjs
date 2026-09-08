import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
export async function createScenario(game) {
  const spec = JSON.parse(await readFile(resolve(game.root, "preview.config.json"), "utf8"));
  if (
    spec.schemaVersion !== 1 ||
    !Number.isInteger(spec.players) ||
    spec.players < 1 ||
    spec.players > game.config.game.maxPlayers ||
    !Number.isInteger(spec.warmupTicks) ||
    spec.warmupTicks < 0 ||
    spec.warmupTicks > 600 ||
    !Array.isArray(spec.events)
  )
    throw new Error(`${game.id}: invalid preview scenario`);
  const { createServerGame } = await import(
    pathToFileURL(resolve(game.root, "dist/server.js")).href
  );
  const server = await createServerGame({
    roomId: "preview",
    gameId: game.id,
    gameVersion: game.config.game.version,
    seed: 42,
  });
  for (let i = 0; i < spec.players; i++)
    await server.onJoin({ id: `preview-${i}`, connectedAt: 0 });
  let tick = 0,
    sequence = 0;
  const advance = async () => {
    for (const event of spec.events.filter((event) => event.tick === tick)) {
      const indices =
        event.player === "all" ? Array.from({ length: spec.players }, (_, i) => i) : [event.player];
      for (const i of indices) await server.onInput(`preview-${i}`, event.input, ++sequence);
    }
    await server.tick(tick * 50, 50);
    tick++;
    return { type: "snapshot", tick, serverTime: tick * 50, state: server.snapshot() };
  };
  let snapshot;
  for (let i = 0; i < spec.warmupTicks; i++) snapshot = await advance();
  return { spec, server, advance, snapshot: snapshot ?? (await advance()) };
}
