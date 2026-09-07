export function LibraryTools({
  query,
  players,
  onlyFavorites,
  count,
  onQuery,
  onPlayers,
  onFavorites,
  onRandom,
}: {
  query: string;
  players: number;
  onlyFavorites: boolean;
  count: number;
  onQuery: (value: string) => void;
  onPlayers: (value: number) => void;
  onFavorites: () => void;
  onRandom: () => void;
}) {
  return (
    <search className="library-tools" aria-label="Find a game">
      <input
        type="search"
        aria-label="Search games"
        placeholder="Find a game"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />
      <select
        aria-label="Player count"
        value={players}
        onChange={(e) => onPlayers(Number(e.target.value))}
      >
        <option value={0}>Any party size</option>
        {[1, 2, 3, 4].map((n) => (
          <option key={n} value={n}>
            {n} player{n > 1 ? "s" : ""}
          </option>
        ))}
      </select>
      <button type="button" aria-pressed={onlyFavorites} onClick={onFavorites}>
        Favorites
      </button>
      <button type="button" disabled={!count} onClick={onRandom}>
        Surprise me
      </button>
    </search>
  );
}
