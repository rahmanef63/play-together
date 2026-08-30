import type { ServerMessage } from "@play-together/contracts";
import type { GameRegistryEntry } from "../../shared/types";

export type RemoteRole = "controller" | "display";
export type RemoteDisplayLayout = "shared" | "split";
export type PresencePlayer = Extract<ServerMessage, { type: "presence" }>["players"][number];

export interface RemoteDisplayPlan {
  layout: RemoteDisplayLayout;
  playerIds: string[];
}

export function inferRemoteRole({
  width,
  coarsePointer,
}: {
  width: number;
  coarsePointer: boolean;
}): RemoteRole {
  if (width <= 600) return "controller";
  if (coarsePointer && width <= 960) return "controller";
  return "display";
}

export function remoteControllers(players: PresencePlayer[]): PresencePlayer[] {
  const earliestByPlayer = new Map<string, PresencePlayer>();
  for (const player of players) {
    if (player.role !== "controller" || player.mode !== "remote") continue;
    const current = earliestByPlayer.get(player.playerId);
    if (!current || player.connectedAt < current.connectedAt)
      earliestByPlayer.set(player.playerId, player);
  }
  return [...earliestByPlayer.values()].sort(
    (left, right) =>
      left.connectedAt - right.connectedAt || left.playerId.localeCompare(right.playerId),
  );
}

export function resolveRemoteDisplayPolicy(
  entry: GameRegistryEntry | undefined,
): GameRegistryEntry["presentation"]["remoteDisplay"] {
  return entry?.presentation.remoteDisplay ?? { mode: "shared", maxViewports: 1 };
}

export function createRemoteDisplayPlan({
  players,
  fallbackPlayerId,
  policy,
}: {
  players: PresencePlayer[];
  fallbackPlayerId: string;
  policy: GameRegistryEntry["presentation"]["remoteDisplay"];
}): RemoteDisplayPlan {
  const controllers = remoteControllers(players);
  if (policy.mode === "shared") {
    return {
      layout: "shared",
      playerIds: [controllers[0]?.playerId ?? fallbackPlayerId],
    };
  }

  const playerIds = controllers
    .slice(0, Math.max(1, policy.maxViewports))
    .map((player) => player.playerId);
  if (playerIds.length <= 1) {
    return {
      layout: "shared",
      playerIds: playerIds.length ? playerIds : [fallbackPlayerId],
    };
  }
  return { layout: "split", playerIds };
}
