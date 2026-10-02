import { type FormEvent, useState } from "react";
import { PreviewCardSkeleton, SkeletonBlock } from "../../../shared/Skeleton";
import type { CurrentUser } from "../../../shared/types";
import { Button } from "../../../shared/ui/Button";
import { EmptyState } from "../../../shared/ui/EmptyState";
import { FormField } from "../../../shared/ui/FormField";
import { ScrollablePanel } from "../../../shared/ui/ScrollablePanel";
import type { useGameCatalog } from "../model/useGameCatalog";
import { GameLibrary } from "./GameLibrary";

export function CreateRoomPanel({
  user,
  catalog,
  busy,
  onSubmit,
}: {
  user: CurrentUser;
  catalog: ReturnType<typeof useGameCatalog>;
  busy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [setup, setSetup] = useState(false);
  const {
    games,
    loadingGames,
    selectedGame,
    selectedManifest,
    selectedManifestError,
    effectiveGameKey,
  } = catalog;
  return (
    <section className="create-panel" data-setup={setup} aria-label="Start a session">
      <GameLibrary catalog={catalog} onSetup={() => setSetup(true)} />
      <ScrollablePanel className="session-setup" title="New room" ariaLabel="Create room settings">
        <button type="button" className="setup-back" onClick={() => setSetup(false)}>
          Back to library
        </button>
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
                  onChange={(event) => {
                    catalog.clearFilters();
                    catalog.setSelectedGameKey(event.target.value);
                  }}
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
            title={games.length ? "No matching games" : "No games available"}
            body={
              games.length
                ? "Clear the library filters to choose a game."
                : "Check back soon for a new game."
            }
          />
        )}
      </ScrollablePanel>
    </section>
  );
}
