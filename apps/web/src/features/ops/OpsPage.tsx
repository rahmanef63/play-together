import { useQuery } from "convex/react";
import { api } from "../../shared/convexApi";
import { navigate } from "../../shared/navigation";
import { ScrollArea } from "../../shared/ScrollArea";
import { SkeletonBlock } from "../../shared/Skeleton";
import type { CurrentUser, GameSummary } from "../../shared/types";

const GAME_SKELETON_KEYS = ["game-a", "game-b", "game-c", "game-d", "game-e"] as const;

export function OpsPage({ user }: { user: CurrentUser }) {
  const gamesResult = useQuery(api.games.listPublished) as GameSummary[] | undefined;
  const games = gamesResult ?? [];

  return (
    <main className="app-shell ops-page-native">
      <header className="topbar desktop-topbar">
        <button className="brand-button" type="button" onClick={() => navigate("/")}>
          <span>PT</span> Play Together
        </button>
        <button className="ghost-button" type="button" onClick={() => navigate("/")}>
          ← Lobby
        </button>
      </header>
      <ScrollArea className="ops-page-native__scroll" ariaLabel="Platform system console">
        <div className="ops-page-native__content">
          <section className="page-heading ops-heading">
            <div>
              <p className="eyebrow">SYSTEM CONSOLE</p>
              <h1>Platform and game versions.</h1>
              <p>
                Signed in as {user.name}. Publishing stays server-side; no release token is exposed
                here.
              </p>
            </div>
          </section>
          <div className="ops-grid">
            <section className="panel ops-catalog-panel">
              <div className="section-title">
                <div>
                  <p className="eyebrow">CATALOG</p>
                  <h2>Published games</h2>
                </div>
                <span>{gamesResult === undefined ? "…" : games.length}</span>
              </div>
              <div className="ops-game-list">
                {gamesResult === undefined
                  ? GAME_SKELETON_KEYS.map((key) => <GameVersionSkeleton key={key} />)
                  : games.map((game) => (
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
                    ))}
              </div>
            </section>
            <aside className="panel architecture-card">
              <p className="eyebrow">ISOLATION MODEL</p>
              <h2>One game update is not a platform update.</h2>
              <ol>
                <li>Room stores an immutable game version and manifest hash.</li>
                <li>Browser verifies controller/display bundles before import.</li>
                <li>Gateway verifies the server bundle and starts a room Worker.</li>
                <li>Existing rooms retain their pinned version.</li>
              </ol>
              <button
                className="secondary-button full"
                type="button"
                onClick={() => navigate("/developers")}
              >
                Open submission & MCP guide
              </button>
            </aside>
          </div>
        </div>
      </ScrollArea>
    </main>
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
