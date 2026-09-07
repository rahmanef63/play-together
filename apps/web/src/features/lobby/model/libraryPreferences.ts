import type { GameSummary } from "../../../shared/types";
export const FAVORITES_KEY = "play-together:favorite-games:v1";
export function readFavorites(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
    return Array.isArray(value)
      ? [
          ...new Set(
            value.filter(
              (id): id is string => typeof id === "string" && /^[a-z0-9-]{1,64}$/.test(id),
            ),
          ),
        ].slice(0, 100)
      : [];
  } catch {
    return [];
  }
}
export function filterGames(
  games: GameSummary[],
  query: string,
  players: number,
  favorites: string[],
  onlyFavorites: boolean,
) {
  const term = query.trim().toLowerCase();
  return games.filter(
    (game) =>
      game.title.toLowerCase().includes(term) &&
      (!players || (game.minPlayers <= players && game.maxPlayers >= players)) &&
      (!onlyFavorites || favorites.includes(game.gameId)),
  );
}
export function randomGameKey(
  games: GameSummary[],
  current: string,
  random = Math.random,
): string | null {
  const alternatives = games.filter((game) => `${game.gameId}@${game.version}` !== current);
  const pool = alternatives.length ? alternatives : games;
  const game = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
  return game ? `${game.gameId}@${game.version}` : null;
}
