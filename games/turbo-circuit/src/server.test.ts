import { describe, expect, it } from "vitest";
import { createServerGame } from "./server.js";

const ctx = { roomId: "r", gameId: "turbo-circuit", gameVersion: "0.5.0", seed: 7 };

async function startSolo(seed = 7) {
  const game = await createServerGame({ ...ctx, seed });
  await game.onJoin({ id: "p", connectedAt: 0 });
  await game.onInput("p", { drive: true }, 1);
  for (let i = 0; i < 14; i++) await game.tick(i * 50, 50);
  expect((game.snapshot() as any).phase).toBe("countdown");
  for (let i = 0; i < 61; i++) await game.tick(700 + i * 50, 50);
  expect((game.snapshot() as any).phase).toBe("racing");
  return game;
}

describe("Turbo Circuit", () => {
  it("uses a PS1-style setup phase for car and circuit selection", async () => {
    const game = await createServerGame(ctx);
    await game.onJoin({ id: "p", connectedAt: 0 });
    let state = game.snapshot() as any;
    expect(state.phase).toBe("setup");
    expect(state.circuitId).toBe("sunset-ring");
    expect(state.racers.find((r: any) => r.id === "p").carId).toBe("falcon-r");

    await game.onInput("p", { steer: 1, menuY: 0 }, 1);
    state = game.snapshot() as any;
    expect(state.racers.find((r: any) => r.id === "p").carId).toBe("comet-gt");
    await game.onInput("p", { steer: 0, menuY: 0 }, 2);
    await game.onInput("p", { steer: 0, menuY: 1 }, 3);
    state = game.snapshot() as any;
    expect(state.circuitId).toBe("harbor-bend");
  });

  it("needs only one GO press and then keeps auto-throttle active", async () => {
    const game = await startSolo();
    for (let i = 0; i < 25; i++) await game.tick(4000 + i * 50, 50);
    const me = (game.snapshot() as any).racers.find((r: any) => r.id === "p");
    expect(me.autoDrive).toBe(true);
    expect(me.speed).toBeGreaterThan(15);
  });

  it("allows nitro without holding a gas control", async () => {
    const game = await startSolo();
    for (let i = 0; i < 18; i++) await game.tick(4000 + i * 50, 50);
    const before = (game.snapshot() as any).racers.find((r: any) => r.id === "p");
    expect(before.speed).toBeGreaterThan(2);
    await game.onInput("p", { boost: true }, 2);
    for (let i = 0; i < 10; i++) await game.tick(5000 + i * 50, 50);
    const after = (game.snapshot() as any).racers.find((r: any) => r.id === "p");
    expect(after.nitro).toBeLessThan(before.nitro);
    expect(after.speed).toBeGreaterThan(before.speed);
  });

  it("maps left steering to the vehicle local left side", async () => {
    const game = await startSolo(3);
    for (let i = 0; i < 15; i++) await game.tick(4000 + i * 50, 50);
    const before = (game.snapshot() as any).racers.find((r: any) => r.id === "p");
    await game.onInput("p", { steer: -1 }, 2);
    for (let i = 0; i < 24; i++) await game.tick(5000 + i * 50, 50);
    const after = (game.snapshot() as any).racers.find((r: any) => r.id === "p");
    const rightX = -Math.cos(before.heading);
    const rightZ = Math.sin(before.heading);
    const lateral = (after.x - before.x) * rightX + (after.z - before.z) * rightZ;
    expect(lateral).toBeLessThan(0);
  });

  it("keeps CPU behavior bounded but non-uniform from logistic chaos", async () => {
    const game = await startSolo(19);
    const samples: number[][] = [];
    for (let window = 0; window < 5; window++) {
      for (let i = 0; i < 14; i++) await game.tick(5000 + window * 700 + i * 50, 50);
      samples.push(
        (game.snapshot() as any).racers
          .filter((r: any) => r.bot)
          .map((r: any) => Math.round(r.speed * 10) / 10),
      );
    }
    const flattened = samples.flat();
    expect(Math.min(...flattened)).toBeGreaterThan(6);
    expect(Math.max(...flattened)).toBeLessThan(60);
    expect(new Set(flattened).size).toBeGreaterThan(5);
  });

  it("persists driver-view camera choice independently of driving", async () => {
    const game = await startSolo();
    await game.onInput("p", { cockpit: true }, 2);
    const me = (game.snapshot() as any).racers.find((r: any) => r.id === "p");
    expect(me.cockpit).toBe(true);
    expect(me.autoDrive).toBe(true);
  });
});
