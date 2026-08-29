import { useQuery } from "convex/react";
import { api } from "../../shared/convexApi";
import { navigate } from "../../shared/navigation";
import type { CurrentUser, GameSummary } from "../../shared/types";

export function OpsPage({ user }: { user: CurrentUser }) {
  const games = (useQuery(api.games.listPublished) ?? []) as GameSummary[];
  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand-button" type="button" onClick={() => navigate("/")}>
          <span>PT</span> Play Together
        </button>
        <button className="ghost-button" type="button" onClick={() => navigate("/")}>
          ← Lobby
        </button>
      </header>
      <section className="page-heading">
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
        <section className="panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">CATALOG</p>
              <h2>Published games</h2>
            </div>
            <span>{games.length}</span>
          </div>
          {games.map((game) => (
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
        </aside>
      </div>
    </main>
  );
}
