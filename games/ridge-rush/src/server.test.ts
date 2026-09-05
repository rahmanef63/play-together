import { describe, expect, it } from "vitest";
import { createServerGame } from "./server.js";

type Snapshot = {
  phase: string;
  countdownMs: number;
  elapsedMs: number;
  riders: Array<{
    id: string;
    bot: boolean;
    progress: number;
    speed: number;
    stamina: number;
    ready: boolean;
  }>;
};

const context = { roomId: "room", gameId: "ridge-rush", gameVersion: "0.1.2", seed: 41 };
const snap = (game: Awaited<ReturnType<typeof createServerGame>>) => game.snapshot() as Snapshot;

async function start(game: Awaited<ReturnType<typeof createServerGame>>, id = "p1") {
  await game.onInput(id, { action: "ready" }, 1);
  for (let i = 0; i < 60; i += 1) await game.tick(i * 50, 50);
}

describe("Ridge Rush authoritative server", () => {
  it("creates a four-rider field while preserving four human slots", async () => {
    const game = await createServerGame(context);
    await game.onJoin({ id: "p1", connectedAt: 0 });
    expect(snap(game).riders).toHaveLength(4);
    expect(snap(game).riders.filter((rider) => !rider.bot)).toHaveLength(1);
    await game.onJoin({ id: "p2", connectedAt: 0 });
    expect(snap(game).riders).toHaveLength(4);
    expect(snap(game).riders.filter((rider) => !rider.bot)).toHaveLength(2);
  });

  it("waits for every human before countdown and starts after three seconds", async () => {
    const game = await createServerGame(context);
    await game.onJoin({ id: "p1", connectedAt: 0 });
    await game.onJoin({ id: "p2", connectedAt: 0 });
    await game.onInput("p1", { action: "ready" }, 1);
    expect(snap(game).phase).toBe("lobby");
    await game.onInput("p2", { action: "ready" }, 1);
    expect(snap(game).phase).toBe("countdown");
    for (let i = 0; i < 59; i += 1) await game.tick(i * 50, 50);
    expect(snap(game).phase).toBe("countdown");
    await game.tick(3000, 50);
    expect(snap(game).phase).toBe("racing");
  });

  it("moves a human with basic stick and pedal controls while bots race too", async () => {
    const game = await createServerGame(context);
    await game.onJoin({ id: "p1", connectedAt: 0 });
    await start(game);
    await game.onInput("p1", { steer: 0, body: 0, pedal: true }, 2);
    for (let i = 0; i < 160; i += 1) await game.tick(3000 + i * 50, 50);
    const state = snap(game);
    const human = state.riders.find((rider) => rider.id === "p1");
    expect(human?.progress).toBeGreaterThan(90);
    expect(human?.speed).toBeGreaterThan(15);
    expect(state.riders.filter((rider) => rider.bot).some((rider) => rider.progress > 80)).toBe(
      true,
    );
  });

  it("rejects stale sequences and malformed input without poisoning simulation", async () => {
    const game = await createServerGame(context);
    await game.onJoin({ id: "p1", connectedAt: 0 });
    await start(game);
    await game.onInput("p1", { pedal: true }, 2);
    await game.onInput("p1", { brake: true }, 2);
    await game.onInput("p1", { steer: Number.NaN }, 3);
    for (let i = 0; i < 80; i += 1) await game.tick(3000 + i * 50, 50);
    const human = snap(game).riders.find((rider) => rider.id === "p1");
    expect(human?.speed).toBeGreaterThan(14);
    expect(Number.isFinite(human?.progress)).toBe(true);
  });

  it("ignores non-finite delta values", async () => {
    const game = await createServerGame(context);
    await game.onJoin({ id: "p1", connectedAt: 0 });
    const before = game.snapshot();
    await game.tick(0, Number.POSITIVE_INFINITY);
    expect(game.snapshot()).toEqual(before);
  });

  it("lets a disconnected racer continue as AI and reclaim the same rider on reconnect", async () => {
    const game = await createServerGame(context);
    await game.onJoin({ id: "p1", connectedAt: 0 });
    await start(game);
    await game.onLeave("p1");
    expect(snap(game).riders.find((rider) => rider.id === "p1")?.bot).toBe(true);
    for (let i = 0; i < 40; i += 1) await game.tick(3000 + i * 50, 50);
    const progress = snap(game).riders.find((rider) => rider.id === "p1")?.progress ?? 0;
    expect(progress).toBeGreaterThan(0);
    await game.onJoin({ id: "p1", connectedAt: 8000 });
    expect(snap(game).riders.find((rider) => rider.id === "p1")?.bot).toBe(false);
    expect(snap(game).riders.find((rider) => rider.id === "p1")?.progress).toBeCloseTo(progress, 5);
  });

  it("is deterministic for equal seeds, joins, input and ticks", async () => {
    const first = await createServerGame(context);
    const second = await createServerGame(context);
    for (const game of [first, second]) {
      await game.onJoin({ id: "p1", connectedAt: 0 });
      await start(game);
      await game.onInput("p1", { pedal: true, sprint: true, steer: 0.15 }, 2);
      for (let i = 0; i < 100; i += 1) await game.tick(3000 + i * 50, 50);
    }
    expect(second.snapshot()).toEqual(first.snapshot());
  });
});
