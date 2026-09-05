import { describe, expect, it } from "vitest";
import { createServerGame } from "./server.js";

const context = { roomId: "ring", gameId: "clash-arena", gameVersion: "0.1.3", seed: 17 };
type Snapshot = {
  phase: string;
  timerMs: number;
  fighters: Array<{ id: string; bot: boolean; name: string; x: number; hp: number }>;
};
const snapshot = (game: Awaited<ReturnType<typeof createServerGame>>) =>
  game.snapshot() as Snapshot;

async function createGame(twoHumans = false) {
  const game = await createServerGame(context);
  await game.onJoin({ id: "nova", connectedAt: 0 });
  if (twoHumans) await game.onJoin({ id: "kite", connectedAt: 1 });
  return game;
}
async function ticks(game: Awaited<ReturnType<typeof createServerGame>>, count: number, ms = 50) {
  for (let index = 0; index < count; index += 1) await game.tick(index * ms, ms);
}

describe("Clash Arena authoritative server", () => {
  it("adds one deterministic CPU for solo play and replaces it with a second human", async () => {
    const game = await createGame();
    expect(snapshot(game).fighters.filter((fighter) => fighter.bot)).toHaveLength(1);
    await game.onJoin({ id: "kite", connectedAt: 1 });
    expect(snapshot(game).fighters.map((fighter) => fighter.bot)).toEqual([false, false]);
  });

  it("is deterministic for equal seed, input and ticks", async () => {
    const first = await createGame();
    const second = await createGame();
    for (const game of [first, second]) {
      await game.onInput("nova", { x: -1, a: true }, 1);
      await ticks(game, 30);
    }
    expect(snapshot(second)).toEqual(snapshot(first));
  });

  it("rejects shoulder fields, stale sequences and non-finite values", async () => {
    const game = await createGame();
    const before = snapshot(game);
    await game.onInput("nova", { l1: true }, 1);
    await game.onInput("nova", { x: Number.POSITIVE_INFINITY }, 2);
    await game.onInput("nova", { a: true }, 2);
    await game.tick(0, Number.POSITIVE_INFINITY);
    expect(snapshot(game)).toEqual(before);
  });

  it("counts down a full sixty-second round using bounded server ticks", async () => {
    const game = await createGame(true);
    expect(snapshot(game).phase).toBe("fight");
    await ticks(game, 1199);
    expect(snapshot(game).phase).toBe("fight");
    await ticks(game, 1);
    expect(snapshot(game).phase).toBe("round-over");
  });
});
