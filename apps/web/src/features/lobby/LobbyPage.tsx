import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useQuery } from "convex/react";
import { type FormEvent, useMemo, useState } from "react";
import { api } from "../../shared/convexApi";
import { navigate } from "../../shared/navigation";
import type { CurrentUser, GameSummary, RoomSummary } from "../../shared/types";

export function LobbyPage({ user }: { user: CurrentUser }) {
  const { signOut } = useAuthActions();
  const games = (useQuery(api.games.listLatestPublished) ?? []) as GameSummary[];
  const rooms = (useQuery(api.rooms.listPublic) ?? []) as RoomSummary[];
  const createRoom = useAction(api.rooms.create);
  const joinRoom = useAction(api.rooms.join);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [selectedGameKey, setSelectedGameKey] = useState("");
  const defaultGame = games[0];
  const gameById = useMemo(
    () => new Map(games.map((game) => [`${game.gameId}@${game.version}`, game])),
    [games],
  );
  const effectiveGameKey =
    selectedGameKey || (defaultGame ? `${defaultGame.gameId}@${defaultGame.version}` : "");
  const selectedGame = gameById.get(effectiveGameKey) ?? defaultGame;

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const [gameId, gameVersion] = String(data.get("game") ?? "").split("@");
    const game = gameById.get(`${gameId}@${gameVersion}`);
    try {
      if (!gameId || !gameVersion || !game) throw new Error("Choose a published game");
      const password = String(data.get("password") ?? "").trim();
      const visibility: "public" | "private" =
        data.get("visibility") === "private" ? "private" : "public";
      const base = {
        name: String(data.get("name") ?? ""),
        gameId,
        gameVersion,
        visibility,
        maxPlayers: Number(data.get("maxPlayers") || game.maxPlayers),
      };
      const result = await createRoom(password ? { ...base, password } : base);
      navigate(`/room/${result.code}`);
    } catch (reason) {
      setError(readError(reason));
    } finally {
      setBusy(false);
    }
  };

  const onJoin = async (code = joinCode, password = joinPassword) => {
    if (!code.trim()) return;
    setBusy(true);
    setError("");
    try {
      const normalizedCode = code.trim().toUpperCase();
      const result = await joinRoom(
        password ? { code: normalizedCode, password } : { code: normalizedCode },
      );
      if (!result.ok) throw new Error(result.message);
      navigate(`/room/${result.code}`);
    } catch (reason) {
      setError(readError(reason));
      setJoinCode(code.toUpperCase());
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand-button" type="button" onClick={() => navigate("/")}>
          <span>PT</span> Play Together
        </button>
        <nav>
          <button className="ghost-button" type="button" onClick={() => navigate("/ops")}>
            System
          </button>
          <button
            className="avatar-button"
            type="button"
            onClick={() => void signOut()}
            title="Sign out"
          >
            {initials(user.name)}
          </button>
        </nav>
      </header>
      <section className="page-heading">
        <div>
          <p className="eyebrow">WELCOME, {user.name.toUpperCase()}</p>
          <h1>Find a spot to play together.</h1>
        </div>
        <div className="join-inline">
          <input
            aria-label="Room code"
            placeholder="ROOM CODE"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            maxLength={8}
          />
          <input
            aria-label="Room password"
            placeholder="Password (optional)"
            type="password"
            value={joinPassword}
            onChange={(event) => setJoinPassword(event.target.value)}
          />
          <button
            className="primary-button"
            type="button"
            onClick={() => void onJoin()}
            disabled={busy}
          >
            Join
          </button>
        </div>
      </section>
      {error && (
        <p className="global-error" role="alert">
          {error}
        </p>
      )}
      <div className="lobby-grid">
        <section className="panel create-panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">NEW SESSION</p>
              <h2>Create a server</h2>
            </div>
            <span className="status-badge">Version pinned</span>
          </div>
          {selectedGame ? (
            <form onSubmit={onCreate}>
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
                  onChange={(event) => setSelectedGameKey(event.target.value)}
                >
                  {games.map((game) => (
                    <option
                      key={`${game.gameId}@${game.version}`}
                      value={`${game.gameId}@${game.version}`}
                    >
                      {game.title} · {game.version}
                    </option>
                  ))}
                </select>
              </label>
              <span className="game-picker-label">Gameplay previews</span>
              <div className="game-picker">
                {games.map((game) => {
                  const key = `${game.gameId}@${game.version}`;
                  const active = key === effectiveGameKey;
                  return (
                    <button
                      className={`game-preview-card${active ? " game-preview-card--active" : ""}`}
                      type="button"
                      key={key}
                      aria-pressed={active}
                      onClick={() => setSelectedGameKey(key)}
                    >
                      <img
                        src={`/game-previews/${game.gameId}.png`}
                        alt={`${game.title} gameplay preview`}
                        loading="lazy"
                      />
                      <span>
                        <strong>{game.title}</strong>
                        <small>v{game.version}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
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
          ) : (
            <EmptyState
              title="No published game yet"
              body="Publish a signed game manifest from the operations workflow first."
            />
          )}
        </section>
        <section className="panel rooms-panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">AVAILABLE NOW</p>
              <h2>Public rooms</h2>
            </div>
            <span>{rooms.length} live</span>
          </div>
          <div className="room-list">
            {rooms.map((room) => (
              <article className="room-card" key={room.code}>
                <div>
                  <div className="room-card__top">
                    <strong>{room.name}</strong>
                    {room.requiresPassword && <span title="Password protected">Locked</span>}
                  </div>
                  <p>
                    {room.gameTitle} · hosted by {room.hostName}
                  </p>
                </div>
                <div className="room-card__actions">
                  <span>
                    {room.availableSpots}/{room.maxPlayers} spots
                  </span>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      setJoinCode(room.code);
                      if (!room.requiresPassword) void onJoin(room.code, "");
                    }}
                  >
                    Join
                  </button>
                </div>
              </article>
            ))}
            {!rooms.length && (
              <EmptyState
                title="No public rooms"
                body="Create the first room or join a private room using its code."
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}
function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
function readError(reason: unknown) {
  return reason instanceof Error ? reason.message : "The request could not be completed";
}
