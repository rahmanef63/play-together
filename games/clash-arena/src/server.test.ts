import { describe, expect, it } from "vitest";
import { createServerGame } from "./server.js";

const context = { roomId: "ring", gameId: "clash-arena", gameVersion: "0.4.0", seed: 17 };
type Snapshot = {
  phase: string;
  timerMs: number;
  fighters: Array<{
    id: string;
    bot: boolean;
    name: string;
    character: string;
    ready: boolean;
    x: number;
    hp: number;
    move: string | null;
  }>;
};
const snapshot = (game: Awaited<ReturnType<typeof createServerGame>>) =>
  game.snapshot() as Snapshot;

async function createGame(twoHumans = false) {
  const game = await createServerGame(context);
  await game.onJoin({ id: "nova", connectedAt: 0 });
  if (twoHumans) await game.onJoin({ id: "kite", connectedAt: 1 });
  return game;
}
async function ready(game: Awaited<ReturnType<typeof createServerGame>>, id: string, seq = 1) {
  await game.onInput(id, { a: true }, seq);
  await game.onInput(id, { a: false }, seq + 1);
}
async function ticks(game: Awaited<ReturnType<typeof createServerGame>>, count: number, ms = 50) {
  for (let index = 0; index < count; index += 1) await game.tick(index * ms, ms);
}
async function enterFight(game: Awaited<ReturnType<typeof createServerGame>>, twoHumans = false) {
  await ready(game, "nova");
  if (twoHumans) await ready(game, "kite");
  expect(snapshot(game).phase).toBe("intro");
  await ticks(game, 44);
  expect(snapshot(game).phase).toBe("fight");
}

describe("Clash Arena authoritative server", () => {
  it("shows solo character select, changes once per stick edge and avoids confirm-as-jab", async () => {
    const game = await createGame();
    expect(snapshot(game).phase).toBe("select");
    expect(snapshot(game).fighters.filter((fighter) => fighter.bot)).toHaveLength(1);
    expect(snapshot(game).fighters[0]?.character).toBe("nova-rin");
    await game.onInput("nova", { x: 1 }, 1);
    expect(snapshot(game).fighters[0]?.character).toBe("kite-vale");
    await game.onInput("nova", { x: 1 }, 2);
    expect(snapshot(game).fighters[0]?.character).toBe("kite-vale");
    await game.onInput("nova", { x: 0 }, 3);
    await ready(game, "nova", 4);
    expect(snapshot(game).phase).toBe("intro");
    await ticks(game, 44);
    await game.tick(2_250, 50);
    expect(snapshot(game).fighters[0]?.move).toBeNull();
  });

  it("waits for both humans and replaces a selecting CPU without auto-readying player two", async () => {
    const game = await createGame();
    await game.onJoin({ id: "kite", connectedAt: 1 });
    expect(snapshot(game).fighters.map((fighter) => fighter.bot)).toEqual([false, false]);
    await ready(game, "nova");
    expect(snapshot(game).phase).toBe("select");
    expect(snapshot(game).fighters[1]?.ready).toBe(false);
    await ready(game, "kite");
    expect(snapshot(game).phase).toBe("intro");
  });

  it("is deterministic for equal seed, selection, input and ticks", async () => {
    const first = await createGame();
    const second = await createGame();
    for (const game of [first, second]) {
      await enterFight(game);
      await game.onInput("nova", { x: -1, a: true }, 3);
      await ticks(game, 30);
    }
    expect(snapshot(second)).toEqual(snapshot(first));
  });

  it("rejects shoulder fields, stale sequences and non-finite values", async () => {
    const game = await createGame();
    const before = snapshot(game);
    await game.onInput("nova", { l1: true }, 1);
    await game.onInput("nova", { x: Number.POSITIVE_INFINITY }, 2);
    await game.tick(0, Number.POSITIVE_INFINITY);
    expect(snapshot(game)).toEqual(before);
    await game.onInput("nova", { x: 1 }, 3);
    expect(snapshot(game).fighters[0]?.character).toBe("kite-vale");
    await game.onInput("nova", { x: 0 }, 2);
    expect(snapshot(game).fighters[0]?.character).toBe("kite-vale");
  });

  it("counts down a full sixty-second round after both players finish selection", async () => {
    const game = await createGame(true);
    await enterFight(game, true);
    await ticks(game, 1_199);
    expect(snapshot(game).phase).toBe("fight");
    await ticks(game, 1);
    expect(snapshot(game).phase).toBe("round-over");
  });
});
