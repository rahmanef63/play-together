import { describe, expect, it } from "vitest";
import { createServerGame } from "./server.js";

const c = { roomId: "r", gameId: "ibu-ibu-telur-gulung", gameVersion: "0.1.1", seed: 7 };
describe("Ibu-Ibu Telur Gulung", () => {
  it("runs deterministic waves and fires eggs", async () => {
    const a = await createServerGame(c),
      b = await createServerGame(c);
    for (const g of [a, b]) {
      g.onJoin({ id: "p", connectedAt: 0 });
      g.onInput("p", { start: true, fire: true }, 1);
      g.tick(0, 50);
    }
    expect(a.snapshot()).toEqual(b.snapshot());
    const s: any = a.snapshot();
    expect(s.enemies.length).toBeGreaterThan(0);
    expect(s.shots.some((q: any) => q.kind === "egg")).toBe(true);
  });
  it("keeps input sequence authoritative", async () => {
    const g = await createServerGame(c);
    g.onJoin({ id: "p", connectedAt: 0 });
    g.onInput("p", { start: true, move: 1 }, 2);
    g.onInput("p", { move: -1 }, 1);
    g.tick(0, 50);
    expect((g.snapshot() as any).heroes[0].x).toBeGreaterThan(90);
  });
});
