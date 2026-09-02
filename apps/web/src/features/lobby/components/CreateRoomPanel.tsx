import type { GameManifest } from "@play-together/contracts";
import type { FormEvent } from "react";
import { PreviewCardSkeleton, SkeletonBlock } from "../../../shared/Skeleton";
import type { CurrentUser, GameSummary } from "../../../shared/types";
import { Button } from "../../../shared/ui/Button";
import { EmptyState } from "../../../shared/ui/EmptyState";
import { FormField } from "../../../shared/ui/FormField";
import { FormMessage } from "../../../shared/ui/FormMessage";
import { HorizontalSnap } from "../../../shared/ui/HorizontalSnap";
import { ScrollablePanel } from "../../../shared/ui/ScrollablePanel";
import { consoleControlLabels, consoleLayoutLabel } from "../model/useGameCatalog";

export function CreateRoomPanel({
  user,
  games,
  loadingGames,
  selectedGame,
  selectedManifest,
  selectedManifestError,
  effectiveGameKey,
  busy,
  onGameChange,
  onSubmit,
}: {
  user: CurrentUser;
  games: GameSummary[];
  loadingGames: boolean;
  selectedGame: GameSummary | undefined;
  selectedManifest: GameManifest | null;
  selectedManifestError: string;
  effectiveGameKey: string;
  busy: boolean;
  onGameChange: (key: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <ScrollablePanel
      className="create-panel"
      label="NEW SESSION"
      title="Create a server"
      meta="Version pinned"
      metaClassName="status-badge"
      ariaLabel="Create room settings"
    >
      {selectedGame ? (
        <form onSubmit={onSubmit}>
          <FormField
            label="Room name"
            control={
              <input
                name="name"
                defaultValue={`${user.name}'s room`}
                minLength={2}
                maxLength={64}
                required
              />
            }
          />
          <FormField
            label="Game"
            control={
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
            }
          />
          <span className="game-picker-label">Gameplay previews</span>
          {loadingGames ? (
            <PreviewCardSkeleton count={4} />
          ) : (
            <HorizontalSnap className="game-picker" ariaLabel="Gameplay previews">
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
            </HorizontalSnap>
          )}
          {selectedManifestError && <FormMessage>{selectedManifestError}</FormMessage>}
          {selectedManifest?.controller.console && (
            <div className="console-registry-card">
              <div>
                <span>Console</span>
                <strong>{consoleLayoutLabel(selectedManifest)}</strong>
              </div>
              <div className="console-control-chips">
                {consoleControlLabels(selectedManifest).map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
            </div>
          )}
          <div className="form-row">
            <FormField
              label="Visibility"
              control={
                <select name="visibility">
                  <option value="public">Public listing</option>
                  <option value="private">Private by code</option>
                </select>
              }
            />
            <FormField
              label="Player slots"
              control={
                <input
                  name="maxPlayers"
                  type="number"
                  key={effectiveGameKey}
                  min={selectedGame.minPlayers}
                  max={selectedGame.maxPlayers}
                  defaultValue={selectedGame.maxPlayers}
                />
              }
            />
          </div>
          <FormField
            label="Room password"
            hint="optional"
            control={<input name="password" type="password" minLength={4} maxLength={64} />}
          />
          <Button
            type="submit"
            fullWidth
            busy={busy}
            disabled={!selectedManifest || Boolean(selectedManifestError)}
          >
            Create room
          </Button>
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
    </ScrollablePanel>
  );
}
