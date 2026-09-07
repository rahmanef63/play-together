import { expect, it, vi } from "vitest";
import type { GameSummary } from "../../../shared/types";
import { filterGames, randomGameKey, readFavorites } from "./libraryPreferences";

const games = [
  { gameId: "one", title: "One", version: "1.0.0", minPlayers: 1, maxPlayers: 2 },
  { gameId: "two", title: "Two", version: "1.0.0", minPlayers: 1, maxPlayers: 4 },
] as GameSummary[];
it("combines search, party size and favorites without changing the catalog", () => {
  expect(filterGames(games, " TWO ", 4, ["two"], true)).toEqual([games[1]]);
  expect(filterGames(games, "One", 4, [], false)).toEqual([]);
  expect(randomGameKey(games, "one@1.0.0", () => 0)).toBe("two@1.0.0");
  expect(randomGameKey([], "", () => 0)).toBeNull();
});
it("tolerates unavailable and malformed browser storage", () => {
  vi.stubGlobal("localStorage", { getItem: () => "null" });
  expect(readFavorites()).toEqual([]);
  vi.stubGlobal("localStorage", { getItem: () => '["one",null,"one","bad/id"]' });
  expect(readFavorites()).toEqual(["one"]);
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("blocked");
    },
  });
  expect(readFavorites()).toEqual([]);
  vi.unstubAllGlobals();
});
