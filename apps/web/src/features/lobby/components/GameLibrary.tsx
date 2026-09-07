import { useState } from "react";
import {
  FAVORITES_KEY,
  filterGames,
  randomGameKey,
  readFavorites,
} from "../model/libraryPreferences";
import { LibraryTools } from "./LibraryTools";
import "../libraryTools.css";
import type { GameManifest } from "@play-together/contracts";
import type { GameSummary } from "../../../shared/types";
import { HorizontalSnap } from "../../../shared/ui/HorizontalSnap";
import { consoleControlLabels } from "../model/useGameCatalog";
export function GameLibrary({
  games,
  loadingGames,
  effectiveGameKey,
  onGameChange,
  selectedManifest,
  selectedManifestError,
  onSetup,
}: {
  games: GameSummary[];
  loadingGames: boolean;
  effectiveGameKey: string;
  onGameChange: (key: string) => void;
  selectedManifest: GameManifest | null;
  selectedManifestError: string;
  onSetup: () => void;
}) {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState(0);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [favorites, setFavorites] = useState(readFavorites);
  const visibleGames = filterGames(games, query, players, favorites, onlyFavorites);
  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id)
      ? favorites.filter((value) => value !== id)
      : [...favorites, id].slice(-100);
    setFavorites(next);
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    } catch {
      /* Session-only when storage is unavailable. */
    }
  };
  const selected =
    games.find((game) => `${game.gameId}@${game.version}` === effectiveGameKey) ?? games[0];
  return (
    <section className="console-library" aria-label="Game library">
      <LibraryTools
        query={query}
        players={players}
        onlyFavorites={onlyFavorites}
        count={visibleGames.length}
        onQuery={setQuery}
        onPlayers={setPlayers}
        onFavorites={() => setOnlyFavorites(!onlyFavorites)}
        onRandom={() => {
          const key = randomGameKey(visibleGames, effectiveGameKey);
          if (key) onGameChange(key);
        }}
      />
      <figure className="game-stage">
        {selected && (
          <img
            className="game-stage__image"
            src={`/game-previews/${selected.gameId}.png`}
            alt={`${selected.title} in-game view`}
            decoding="async"
          />
        )}
        <figcaption className="game-stage__caption">
          <h1>{selected?.title ?? (loadingGames ? "Loading games…" : "No games available")}</h1>
          {selected && (
            <button
              className="library-favorite"
              type="button"
              aria-pressed={favorites.includes(selected.gameId)}
              onClick={() => toggleFavorite(selected.gameId)}
            >
              {favorites.includes(selected.gameId) ? "★ Saved" : "☆ Save favorite"}
            </button>
          )}
          <p>
            {selected
              ? `${selected.minPlayers}–${selected.maxPlayers} players · Phone controllers · Shared screen`
              : "Your available games will appear here."}
          </p>
          <button
            type="button"
            className="library-start primary-button"
            onClick={onSetup}
            disabled={!selectedManifest || Boolean(selectedManifestError)}
          >
            Set up room
          </button>
        </figcaption>
      </figure>
      <HorizontalSnap className="game-picker" ariaLabel="Gameplay previews">
        {visibleGames.length === 0 && !loadingGames && (
          <p role="status">No matching games. Clear your search or filters.</p>
        )}
        {visibleGames.map((game) => {
          const key = `${game.gameId}@${game.version}`;
          return (
            <button
              className={`game-preview-card${key === effectiveGameKey ? " game-preview-card--active" : ""}`}
              type="button"
              key={key}
              aria-pressed={key === effectiveGameKey}
              onClick={() => onGameChange(key)}
            >
              <img
                src={`/game-previews/${game.gameId}.png`}
                alt={`${game.title} gameplay preview`}
                loading="lazy"
                decoding="async"
              />
              <span>
                <strong>{game.title}</strong>
                <small>
                  {game.minPlayers}–{game.maxPlayers} players
                </small>
              </span>
            </button>
          );
        })}
      </HorizontalSnap>
      {selectedManifestError ? (
        <p role="alert">{selectedManifestError}</p>
      ) : (
        <p className="library-controls">
          {selectedManifest
            ? consoleControlLabels(selectedManifest).slice(0, 5).join(" · ")
            : "Loading game controls…"}
        </p>
      )}
    </section>
  );
}
