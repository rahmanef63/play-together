import { normalizeRemoteDisplay } from "./gamePresentation";

export function selectLatestPublishedByGame<
  T extends { gameId: string; publishedAt: number; version: string },
>(games: readonly T[]): T[] {
  const latest = new Map<string, T>();
  for (const game of games) {
    const current = latest.get(game.gameId);
    if (
      !current ||
      game.publishedAt > current.publishedAt ||
      (game.publishedAt === current.publishedAt && game.version.localeCompare(current.version) > 0)
    ) {
      latest.set(game.gameId, game);
    }
  }
  return [...latest.values()].sort(
    (left, right) =>
      left.gameId.localeCompare(right.gameId) || left.version.localeCompare(right.version),
  );
}

export function toPublicGameSummary(game: {
  gameId: string;
  version: string;
  title: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  modes: Array<"shared-screen" | "handheld">;
  supportsRemote: boolean;
  supportsHandheld: boolean;
  preferredOrientation?: "portrait" | "landscape" | "adaptive";
  remoteDisplayMode?: "shared" | "per-player";
  maxViewports?: number;
  manifestUrl: string;
  manifestSha256: string;
}) {
  const presentation = normalizeRemoteDisplay(game.remoteDisplayMode, game.maxViewports);
  return {
    gameId: game.gameId,
    version: game.version,
    title: game.title,
    description: game.description,
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
    modes: game.modes,
    supportsRemote: game.supportsRemote,
    supportsHandheld: game.supportsHandheld,
    preferredOrientation: game.preferredOrientation ?? "adaptive",
    manifestUrl: game.manifestUrl,
    manifestSha256: game.manifestSha256,
    presentation: { remoteDisplay: presentation },
  };
}
