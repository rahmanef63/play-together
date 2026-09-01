import { normalizeRemoteDisplay } from "./gamePresentation";

export function selectLatestPublishedByGame<
  T extends { gameId: string; publishedAt: number; version: string },
>(games: readonly T[]): T[] {
  const latest = new Map<string, T>();
  for (const game of games) {
    const current = latest.get(game.gameId);
    const versionOrder = current ? compareSemver(game.version, current.version) : 1;
    if (
      !current ||
      versionOrder > 0 ||
      (versionOrder === 0 && game.publishedAt > current.publishedAt)
    ) {
      latest.set(game.gameId, game);
    }
  }
  return [...latest.values()].sort(
    (left, right) =>
      left.gameId.localeCompare(right.gameId) || left.version.localeCompare(right.version),
  );
}

export function compareSemver(left: string, right: string): number {
  const a = parseSemver(left);
  const b = parseSemver(right);
  for (let index = 0; index < 3; index += 1) {
    const difference = a.core[index]! - b.core[index]!;
    if (difference) return difference > 0 ? 1 : -1;
  }
  if (!a.prerelease.length || !b.prerelease.length) {
    if (a.prerelease.length === b.prerelease.length) return 0;
    return a.prerelease.length ? -1 : 1;
  }
  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = a.prerelease[index];
    const rightPart = b.prerelease[index];
    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;
    if (leftPart === rightPart) continue;
    const leftNumber = /^\d+$/.test(leftPart) ? Number(leftPart) : null;
    const rightNumber = /^\d+$/.test(rightPart) ? Number(rightPart) : null;
    if (leftNumber !== null && rightNumber !== null) return leftNumber > rightNumber ? 1 : -1;
    if (leftNumber !== null) return -1;
    if (rightNumber !== null) return 1;
    return leftPart.localeCompare(rightPart) > 0 ? 1 : -1;
  }
  return 0;
}

function parseSemver(value: string) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(value);
  if (!match) throw new Error(`Invalid semantic game version: ${value}`);
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])] as const,
    prerelease: match[4]?.split(".") ?? [],
  };
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
