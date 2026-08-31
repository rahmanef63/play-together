import type { GameRegistryDocument, GameRegistryEntry } from "../../../shared/types";
import { resolveRemoteDisplayPolicy } from "../remotePresentation";

export async function readPresentationPolicy(
  gameId: string,
  gameVersion: string,
): Promise<GameRegistryEntry["presentation"]["remoteDisplay"]> {
  try {
    const response = await fetch("/game-registry.json", { cache: "no-store", credentials: "omit" });
    if (!response.ok) return resolveRemoteDisplayPolicy(undefined);
    const registry = (await response.json()) as GameRegistryDocument;
    return resolveRemoteDisplayPolicy(
      registry.games.find((game) => game.id === gameId && game.version === gameVersion),
    );
  } catch {
    return resolveRemoteDisplayPolicy(undefined);
  }
}
