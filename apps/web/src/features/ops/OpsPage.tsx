import { useQuery } from "convex/react";
import { api } from "../../shared/convexApi";
import { navigate } from "../../shared/navigation";
import { SkeletonBlock } from "../../shared/Skeleton";
import type { CurrentUser, GameSummary } from "../../shared/types";
import { Button } from "../../shared/ui/Button";
import { ScrollableAppPage } from "../../shared/ui/ScrollableAppPage";
import { ScrollablePanel } from "../../shared/ui/ScrollablePanel";
import { RealtimeTelemetryPanel } from "./RealtimeTelemetryPanel";

const GAME_SKELETON_KEYS = ["game-a", "game-b", "game-c", "game-d", "game-e"] as const;

export function OpsPage({ user }: { user: CurrentUser }) {
  const gamesResult = useQuery(api.games.listPublished) as GameSummary[] | undefined;
  const games = gamesResult ?? [];

  return (
    <ScrollableAppPage
      className="ops-page-native ops-console-page"
      scrollClassName="ops-page-native__scroll"
      contentClassName="ops-page-native__content ops-console-content"
      ariaLabel="Platform system console"
      topbarActions={[{ label: "← Lobby", href: "/" }]}
      topbarClassName="ops-console-topbar"
    >
      <section className="ops-console-overview" aria-labelledby="ops-title">
        <div className="ops-console-overview__copy">
          <span className="ops-console-label">System console</span>
          <h1 id="ops-title">Platform operations</h1>
          <p>
            Published game releases and the isolation rules that keep room sessions pinned to exact
            versions. Signed in as {user.name}.
          </p>
          <div className="ops-console-summary">
            <strong>{gamesResult === undefined ? "…" : games.length}</strong>
            <span>published games</span>
          </div>
        </div>
        <figure className="ops-console-overview__art" aria-hidden="true">
          <img src="/assets/ui/ops/ops-hero-control-room.webp" alt="" />
        </figure>
      </section>

      <RealtimeTelemetryPanel />

      <div className="ops-grid ops-console-grid">
        <ScrollablePanel
          className="ops-catalog-panel"
          titleClassName="ops-panel-title"
          labelClassName="ops-console-label"
          label="Catalog"
          title="Published games"
          meta={gamesResult === undefined ? "Loading" : `${games.length} total`}
          scrollClassName="ops-panel-scroll"
          contentClassName="panel-scroll__content ops-game-list"
          ariaLabel="Published game versions"
        >
          {gamesResult === undefined ? (
            GAME_SKELETON_KEYS.map((key) => <GameVersionSkeleton key={key} />)
          ) : games.length === 0 ? (
            <div className="ops-empty-state">
              <img src="/assets/ui/states/ops-empty-rooms.webp" alt="" aria-hidden="true" />
              <div>
                <strong>No published games</strong>
                <p>Published cartridges will appear here after validation and release.</p>
              </div>
            </div>
          ) : (
            games.map((game) => (
              <article className="game-version" key={`${game.gameId}@${game.version}`}>
                <div>
                  <strong>{game.title}</strong>
                  <p>{game.description}</p>
                </div>
                <div>
                  <code>
                    {game.gameId}@{game.version}
                  </code>
                  <span>
                    {game.minPlayers}–{game.maxPlayers} players
                  </span>
                </div>
              </article>
            ))
          )}
        </ScrollablePanel>

        <ScrollablePanel
          as="aside"
          className="architecture-card ops-architecture-panel"
          titleClassName="ops-panel-title"
          labelClassName="ops-console-label"
          label="Isolation model"
          title="Release boundaries"
          scrollClassName="ops-panel-scroll"
          contentClassName="panel-scroll__content ops-architecture-content"
          ariaLabel="Release isolation model"
        >
          <p>
            A game release changes independently from the portal. Existing rooms keep their stored
            manifest and server bundle.
          </p>
          <ol>
            <li>Room stores an immutable game version and manifest hash.</li>
            <li>Browser verifies controller and display bundles before import.</li>
            <li>Gateway verifies the server bundle and starts an isolated room Worker.</li>
            <li>Existing rooms retain their pinned version until the room closes.</li>
          </ol>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={() => navigate("/developers")}
          >
            Open submission & MCP guide
          </Button>
        </ScrollablePanel>
      </div>
    </ScrollableAppPage>
  );
}

function GameVersionSkeleton() {
  return (
    <article className="game-version game-version--skeleton" aria-hidden="true">
      <div>
        <SkeletonBlock width="44%" height={13} />
        <SkeletonBlock width="80%" height={9} />
      </div>
      <SkeletonBlock width={118} height={30} />
    </article>
  );
}
