import type { GameManifest } from "@play-together/contracts";
import { PreviewCardSkeleton } from "../../../shared/Skeleton";
import type { GameSummary } from "../../../shared/types";
import { FormMessage } from "../../../shared/ui/FormMessage";
import { HorizontalSnap } from "../../../shared/ui/HorizontalSnap";
import { consoleControlLabels, consoleLayoutLabel } from "../model/useGameCatalog";
export function GameLibrary({
  games,
  loadingGames,
  effectiveGameKey,
  onGameChange,
  selectedManifest,
  selectedManifestError,
}: {
  games: GameSummary[];
  loadingGames: boolean;
  effectiveGameKey: string;
  onGameChange: (key: string) => void;
  selectedManifest: GameManifest | null;
  selectedManifestError: string;
}) {
  return (
    <div className="console-library">
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
    </div>
  );
}
