import { describe, expect, it } from "vitest";
import { selectLatestPublishedByGame } from "../convex/_shared/gameCatalog";

describe("latest game catalog", () => {
  it("keeps one newest release per game while retaining independent histories elsewhere", () => {
    const selected = selectLatestPublishedByGame([
      { gameId: "pong", version: "0.1.0", publishedAt: 10 },
      { gameId: "tap-race", version: "0.1.0", publishedAt: 11 },
      { gameId: "pong", version: "0.2.0", publishedAt: 20 },
      { gameId: "tap-race", version: "0.2.0", publishedAt: 21 },
    ]);
    expect(selected.map((game) => `${game.gameId}@${game.version}`)).toEqual([
      "pong@0.2.0",
      "tap-race@0.2.0",
    ]);
  });

  it("uses a deterministic version tie-breaker for equal publish timestamps", () => {
    const [selected] = selectLatestPublishedByGame([
      { gameId: "demo", version: "1.0.0", publishedAt: 10 },
      { gameId: "demo", version: "1.1.0", publishedAt: 10 },
    ]);
    expect(selected?.version).toBe("1.1.0");
  });
});
