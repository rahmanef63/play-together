import { describe, expect, it } from "vitest";
import {
  createRemoteDisplayPlan,
  inferRemoteRole,
  type PresencePlayer,
  remoteControllers,
} from "./remotePresentation";

const presence = (
  playerId: string,
  role: "controller" | "display" = "controller",
  mode: "remote" | "handheld" = "remote",
  connectedAt = 1,
): PresencePlayer => ({ playerId, role, mode, connectedAt });

describe("remote presentation coordinator", () => {
  it("chooses phones as controllers and laptop/TV sized screens as displays", () => {
    expect(inferRemoteRole({ width: 390, coarsePointer: true })).toBe("controller");
    expect(inferRemoteRole({ width: 820, coarsePointer: true })).toBe("controller");
    expect(inferRemoteRole({ width: 820, coarsePointer: false })).toBe("display");
    expect(inferRemoteRole({ width: 1440, coarsePointer: true })).toBe("display");
  });

  it("counts unique remote controllers only", () => {
    const players = [
      presence("player-b", "controller", "remote", 30),
      presence("player-a", "controller", "remote", 10),
      presence("player-a", "controller", "remote", 20),
      presence("handheld", "controller", "handheld", 5),
      presence("tv", "display", "remote", 1),
    ];
    expect(remoteControllers(players).map((player) => player.playerId)).toEqual([
      "player-a",
      "player-b",
    ]);
  });

  it("keeps communal games on one shared display regardless of remote count", () => {
    const plan = createRemoteDisplayPlan({
      players: [presence("a"), presence("b", "controller", "remote", 2)],
      fallbackPlayerId: "host",
      policy: { mode: "shared", maxViewports: 1 },
    });
    expect(plan).toEqual({ layout: "shared", playerIds: ["a"] });
  });

  it("moves per-player games from shared to split and caps the viewport count", () => {
    const policy = { mode: "per-player" as const, maxViewports: 4 };
    expect(
      createRemoteDisplayPlan({
        players: [presence("a")],
        fallbackPlayerId: "host",
        policy,
      }),
    ).toEqual({ layout: "shared", playerIds: ["a"] });

    expect(
      createRemoteDisplayPlan({
        players: [presence("a"), presence("b", "controller", "remote", 2)],
        fallbackPlayerId: "host",
        policy,
      }),
    ).toEqual({ layout: "split", playerIds: ["a", "b"] });

    const fivePlayers = ["a", "b", "c", "d", "e"].map((id, index) =>
      presence(id, "controller", "remote", index + 1),
    );
    expect(
      createRemoteDisplayPlan({ players: fivePlayers, fallbackPlayerId: "host", policy }),
    ).toEqual({ layout: "split", playerIds: ["a", "b", "c", "d"] });
  });
});
