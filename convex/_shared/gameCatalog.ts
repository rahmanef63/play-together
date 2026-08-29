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
