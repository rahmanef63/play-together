import type { FormEvent } from "react";
import { ScrollArea } from "../../../shared/ScrollArea";
import { PreviewCardSkeleton, SkeletonBlock } from "../../../shared/Skeleton";
import type { CurrentUser, GameRegistryEntry, GameSummary } from "../../../shared/types";
import { consoleControlLabels, consoleLayoutLabel } from "../model/useGameCatalog";

export function CreateRoomPanel({
  user,
  games,
  loadingGames,
  selectedGame,
  selectedRegistry,
  effectiveGameKey,
  busy,
  onGameChange,
  onSubmit,
}: {
  user: CurrentUser;
  games: GameSummary[];
  loadingGames: boolean;
  selectedGame: GameSummary | undefined;
  selectedRegistry: GameRegistryEntry | undefined;
  effectiveGameKey: string;
  busy: boolean;
  onGameChange: (key: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="panel create-panel panel-frame">
      <div className="section-title">
        <div>
          <p className="eyebrow">NEW SESSION</p>
          <h2>Create a server</h2>
        </div>
        <span className="status-badge">Version pinned</span>
      </div>
      <ScrollArea className="panel-scroll" ariaLabel="Create room settings">
        <div className="panel-scroll__content">
          {selectedGame ? (
            <form onSubmit={onSubmit}>
              <label className="field">
                <span>Room name</span>
                <input
                  name="name"
                  defaultValue={`${user.name}'s room`}
                  minLength={2}
                  maxLength={64}
                  required
                />
              </label>
              <label className="field">
                <span>Game</span>
                <select
                  name="game"
                  value={effectiveGameKey}
                  onChange={(event) => onGameChange(event.target.value)}
                >
                  {games.map((game) => {
                    const key = `${game.gameId}@${game.version}`;
                    return (
                      <option key={key} value={key}>
                        {game.title} · {game.version}
                      </option>
                    );
                  })}
                </select>
              </label>
              <span className="game-picker-label">Gameplay previews</span>
              {loadingGames ? (
                <PreviewCardSkeleton count={4} />
              ) : (
                <div className="game-picker">
                  {games.map((game) => {
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
                          <small>v{game.version}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedRegistry?.controller.console && (
                <div className="console-registry-card">
                  <div>
                    <span>Console</span>
                    <strong>{consoleLayoutLabel(selectedRegistry)}</strong>
                  </div>
                  <div className="console-control-chips">
                    {consoleControlLabels(selectedRegistry).map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="form-row">
                <label className="field">
                  <span>Visibility</span>
                  <select name="visibility">
                    <option value="public">Public listing</option>
                    <option value="private">Private by code</option>
                  </select>
                </label>
                <label className="field">
                  <span>Player slots</span>
                  <input
                    name="maxPlayers"
                    type="number"
                    key={effectiveGameKey}
                    min={selectedGame.minPlayers}
                    max={selectedGame.maxPlayers}
                    defaultValue={selectedGame.maxPlayers}
                  />
                </label>
              </div>
              <label className="field">
                <span>
                  Room password <small>optional</small>
                </span>
                <input name="password" type="password" minLength={4} maxLength={64} />
              </label>
              <button className="primary-button full" type="submit" disabled={busy}>
                Create room
              </button>
            </form>
          ) : loadingGames ? (
            <div className="create-form-skeleton" aria-hidden="true">
              <SkeletonBlock width="38%" height={10} />
              <SkeletonBlock height={44} />
              <SkeletonBlock width="31%" height={10} />
              <PreviewCardSkeleton count={2} />
              <SkeletonBlock height={44} />
              <SkeletonBlock height={44} />
            </div>
          ) : (
            <EmptyState
              title="No published game yet"
              body="Publish a signed game manifest from the operations workflow first."
            />
          )}
        </div>
      </ScrollArea>
    </section>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}
