import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useMutation, useQuery } from "convex/react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../../shared/convexApi";
import { navigate } from "../../shared/navigation";
import { ScrollArea } from "../../shared/ScrollArea";
import type {
  CurrentUser,
  GameRegistryDocument,
  GameRegistryEntry,
  GameSummary,
  MyRoomSummary,
  RoomSummary,
} from "../../shared/types";

export function LobbyPage({ user }: { user: CurrentUser }) {
  const { signOut } = useAuthActions();
  const games = (useQuery(api.games.listLatestPublished) ?? []) as GameSummary[];
  const rooms = (useQuery(api.rooms.listPublic) ?? []) as RoomSummary[];
  const myRooms = (useQuery(api.rooms.listMine) ?? []) as MyRoomSummary[];
  const createRoom = useAction(api.rooms.create);
  const joinRoom = useAction(api.rooms.join);
  const updateRoom = useAction(api.rooms.update);
  const removeRoom = useMutation(api.rooms.remove);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [selectedGameKey, setSelectedGameKey] = useState("");
  const [registry, setRegistry] = useState<GameRegistryDocument | null>(null);
  const [roomTab, setRoomTab] = useState<"public" | "mine">("public");
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [deleteCode, setDeleteCode] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/game-registry.json", { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Game registry request failed (${response.status})`);
        return response.json() as Promise<GameRegistryDocument>;
      })
      .then(setRegistry)
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) setRegistry(null);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!deleteCode) return;
    const timer = setTimeout(() => setDeleteCode(null), 5_000);
    return () => clearTimeout(timer);
  }, [deleteCode]);

  const defaultGame = games[0];
  const gameById = useMemo(
    () => new Map(games.map((game) => [`${game.gameId}@${game.version}`, game])),
    [games],
  );
  const effectiveGameKey =
    selectedGameKey || (defaultGame ? `${defaultGame.gameId}@${defaultGame.version}` : "");
  const selectedGame = gameById.get(effectiveGameKey) ?? defaultGame;
  const selectedRegistry = registry?.games.find(
    (entry) => `${entry.id}@${entry.version}` === effectiveGameKey,
  );

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

  const onUpdate = async (event: FormEvent<HTMLFormElement>, room: MyRoomSummary) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const passwordMode = String(data.get("passwordMode") ?? "keep") as "keep" | "set" | "remove";
    const password = String(data.get("password") ?? "").trim();
    try {
      await updateRoom({
        code: room.code,
        name: String(data.get("name") ?? room.name),
        visibility: data.get("visibility") === "private" ? "private" : "public",
        maxPlayers: Number(data.get("maxPlayers") ?? room.maxPlayers),
        passwordMode,
        ...(passwordMode === "set" ? { password } : {}),
      });
      setEditingCode(null);
    } catch (reason) {
      setError(readError(reason));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (room: MyRoomSummary) => {
    if (deleteCode !== room.code) {
      setDeleteCode(room.code);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await removeRoom({ code: room.code });
      setDeleteCode(null);
      if (editingCode === room.code) setEditingCode(null);
    } catch (reason) {
      setError(readError(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="app-shell app-shell--lobby">
      <header className="topbar">
        <button className="brand-button" type="button" onClick={() => navigate("/")}>
          <span>PT</span> Play Together
        </button>
        <nav>
          <button
            className="ghost-button mobile-keep"
            type="button"
            onClick={() => navigate("/templates")}
          >
            Templates
          </button>
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
              ) : (
                <EmptyState
                  title="No published game yet"
                  body="Publish a signed game manifest from the operations workflow first."
                />
              )}
            </div>
          </ScrollArea>
        </section>

        <section className="panel rooms-panel panel-frame rooms-panel-frame">
          <div className="section-title">
            <div>
              <p className="eyebrow">ROOM DIRECTORY</p>
              <h2>{roomTab === "public" ? "Public rooms" : "My rooms"}</h2>
            </div>
            <span>{roomTab === "public" ? `${rooms.length} live` : `${myRooms.length} owned`}</span>
          </div>
          <div className="room-tabs" role="tablist" aria-label="Room lists">
            <button
              type="button"
              role="tab"
              aria-selected={roomTab === "public"}
              className={roomTab === "public" ? "active" : ""}
              onClick={() => setRoomTab("public")}
            >
              Public
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={roomTab === "mine"}
              className={roomTab === "mine" ? "active" : ""}
              onClick={() => setRoomTab("mine")}
            >
              My rooms
            </button>
          </div>
          <ScrollArea className="panel-scroll room-list-scroll" ariaLabel={`${roomTab} room list`}>
            <div className="room-list">
              {roomTab === "public"
                ? rooms.map((room) => (
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
                  ))
                : myRooms.map((room) => (
                    <article className="room-card room-card--owned" key={room.code}>
                      {editingCode === room.code ? (
                        <form
                          className="room-editor"
                          onSubmit={(event) => void onUpdate(event, room)}
                        >
                          <div className="room-editor__meta">
                            <strong>{room.gameTitle}</strong>
                            <span>
                              {room.gameVersion} · {room.code}
                            </span>
                          </div>
                          <label className="field">
                            <span>Room name</span>
                            <input
                              name="name"
                              defaultValue={room.name}
                              minLength={2}
                              maxLength={64}
                              required
                            />
                          </label>
                          <div className="form-row">
                            <label className="field">
                              <span>Visibility</span>
                              <select name="visibility" defaultValue={room.visibility}>
                                <option value="public">Public</option>
                                <option value="private">Private</option>
                              </select>
                            </label>
                            <label className="field">
                              <span>Player slots</span>
                              <input
                                name="maxPlayers"
                                type="number"
                                min={1}
                                max={64}
                                defaultValue={room.maxPlayers}
                              />
                            </label>
                          </div>
                          <label className="field">
                            <span>Password action</span>
                            <select name="passwordMode" defaultValue="keep">
                              <option value="keep">Keep current</option>
                              <option value="set">Set new password</option>
                              <option value="remove">Remove password</option>
                            </select>
                          </label>
                          <label className="field">
                            <span>New password</span>
                            <input
                              name="password"
                              type="password"
                              minLength={4}
                              maxLength={64}
                              placeholder="Used only for Set new password"
                            />
                          </label>
                          <div className="room-editor__actions">
                            <button className="primary-button" type="submit" disabled={busy}>
                              Save changes
                            </button>
                            <button
                              className="ghost-button"
                              type="button"
                              onClick={() => setEditingCode(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div>
                            <div className="room-card__top">
                              <strong>{room.name}</strong>
                              <span>{room.visibility}</span>
                              <span>{room.status}</span>
                              {room.requiresPassword && <span>Locked</span>}
                            </div>
                            <p>
                              {room.gameTitle} · {room.gameVersion} · {room.code} ·{" "}
                              {room.activePlayers}/{room.maxPlayers} players
                            </p>
                          </div>
                          <div className="room-card__actions room-card__actions--crud">
                            {room.status === "open" && (
                              <button
                                className="secondary-button"
                                type="button"
                                onClick={() => navigate(`/room/${room.code}`)}
                              >
                                Open
                              </button>
                            )}
                            {room.status === "open" && (
                              <button
                                className="ghost-button"
                                type="button"
                                onClick={() => setEditingCode(room.code)}
                              >
                                Edit
                              </button>
                            )}
                            <button
                              className={`ghost-button danger${deleteCode === room.code ? " danger-confirm" : ""}`}
                              type="button"
                              disabled={busy}
                              onClick={() => void onDelete(room)}
                            >
                              {deleteCode === room.code ? "Confirm delete" : "Delete"}
                            </button>
                          </div>
                        </>
                      )}
                    </article>
                  ))}
              {roomTab === "public" && !rooms.length && (
                <EmptyState
                  title="No public rooms"
                  body="Create the first room or join a private room using its code."
                />
              )}
              {roomTab === "mine" && !myRooms.length && (
                <EmptyState
                  title="No rooms yet"
                  body="Create a room and it will appear here for editing or deletion."
                />
              )}
            </div>
          </ScrollArea>
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

function consoleLayoutLabel(entry: GameRegistryEntry) {
  const layout = entry.controller.console?.layout ?? "gamepad";
  return layout === "gamepad"
    ? "Gamepad"
    : layout === "racing"
      ? "Racing"
      : layout === "flight"
        ? "Flight"
        : layout === "touch"
          ? "Touch surface"
          : "Arcade";
}

function consoleControlLabels(entry: GameRegistryEntry) {
  const controls = entry.controller.console?.controls ?? [];
  return controls.map((control) => {
    if (control.kind === "stick") return "Analog stick";
    if (control.kind === "dpad") return "D-pad";
    if (control.kind === "touchpad") return "Touchpad";
    return control.label;
  });
}
