import { useAction, useMutation, useQuery } from "convex/react";
import { type FormEvent, useEffect, useState } from "react";
import { api } from "../../shared/convexApi";
import { navigate } from "../../shared/navigation";
import { ScrollArea } from "../../shared/ScrollArea";
import type { CurrentUser, RoomDetails } from "../../shared/types";

export function RoomPage({ code, user }: { code: string; user: CurrentUser }) {
  const room = useQuery(api.rooms.getByCode, { code }) as RoomDetails | null | undefined;
  const joinRoom = useAction(api.rooms.join);
  const heartbeat = useMutation(api.rooms.heartbeat);
  const leave = useMutation(api.rooms.leave);
  const close = useMutation(api.rooms.close);
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isMember = room?.activeMembers.some((member) => member.userId === user.id) ?? false;

  useEffect(() => {
    if (!isMember) return;
    void heartbeat({ code });
    const timer = setInterval(() => void heartbeat({ code }), 20_000);
    return () => clearInterval(timer);
  }, [code, heartbeat, isMember]);

  if (room === undefined) return <RoomState label="Loading room…" />;
  if (!room) return <RoomState label="Room not found" action={() => navigate("/")} />;

  const isHost = room.hostUserId === user.id;
  const invite = `${location.origin}/room/${code}`;
  const copy = async () => {
    await navigator.clipboard.writeText(`${invite}\nRoom code: ${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1_500);
  };
  const exit = async () => {
    await leave({ code });
    navigate("/");
  };
  const closeRoom = async () => {
    try {
      await close({ code });
      navigate("/");
    } catch (reason) {
      setError(readError(reason));
    }
  };
  const join = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const args = password ? { code, password } : { code };
      const result = await joinRoom(args);
      if (!result.ok) throw new Error(result.message);
    } catch (reason) {
      setError(readError(reason));
    } finally {
      setBusy(false);
    }
  };

  if (!isMember) {
    return (
      <main className="room-page room-invite-page">
        <header className="room-header">
          <button className="ghost-button" type="button" onClick={() => navigate("/")}>
            ← Lobby
          </button>
          <span className="status-badge">{room.visibility}</span>
        </header>
        <ScrollArea className="room-page-scroll" ariaLabel="Room invitation">
          <div className="room-invite-scroll-content">
            <section className="panel invite-card">
              <p className="eyebrow">ROOM INVITATION</p>
              <h1>{room.name}</h1>
              <p>
                {room.gameTitle} · hosted by {room.hostName} · {room.activeMembers.length}/
                {room.maxPlayers} players
              </p>
              {room.status === "open" ? (
                <form onSubmit={join}>
                  {room.requiresPassword && (
                    <label className="field">
                      <span>Room password</span>
                      <input
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        minLength={4}
                        maxLength={64}
                        required
                      />
                    </label>
                  )}
                  {error && (
                    <p className="form-error" role="alert">
                      {error}
                    </p>
                  )}
                  <button className="primary-button full" type="submit" disabled={busy}>
                    {busy ? "Joining…" : "Join room"}
                  </button>
                </form>
              ) : (
                <button
                  className="secondary-button full"
                  type="button"
                  onClick={() => navigate("/")}
                >
                  This room has closed
                </button>
              )}
            </section>
          </div>
        </ScrollArea>
      </main>
    );
  }

  return (
    <main className="room-page">
      <header className="room-header">
        <button className="ghost-button" type="button" onClick={() => navigate("/")}>
          ← Lobby
        </button>
        <span className="status-badge">{room.status}</span>
      </header>
      <ScrollArea className="room-page-scroll" ariaLabel="Room details">
        <div className="room-page-scroll__content">
          <section className="room-identity">
            <p className="eyebrow">
              {room.gameTitle} · {room.gameVersion}
            </p>
            <h1>{room.name}</h1>
            <button className="room-code" type="button" onClick={() => void copy()}>
              <span>ROOM CODE</span>
              <strong>{code}</strong>
              <small>{copied ? "Copied" : "Tap to copy"}</small>
            </button>
          </section>
          {error && <p className="global-error">{error}</p>}
          <div className="room-layout">
            <section className="panel launch-panel panel-frame">
              <div className="section-title">
                <div>
                  <p className="eyebrow">CHOOSE THIS DEVICE</p>
                  <h2>How are you playing?</h2>
                </div>
              </div>
              <ScrollArea className="panel-scroll" ariaLabel="Play modes">
                <div className="panel-scroll__content">
                  <div className="launch-grid">
                    {room.gameModes.includes("shared-screen") && room.supportsRemote && (
                      <button
                        className="launch-card display-card"
                        type="button"
                        onClick={() => {
                          const shared = window.open(`/play/${code}/display`, "_blank");
                          if (!shared) {
                            setError(
                              "Allow pop-ups so Play Together can open the shared game screen.",
                            );
                            return;
                          }
                          try {
                            shared.opener = null;
                          } catch {}
                          navigate(`/play/${code}/controller?mode=remote`);
                        }}
                      >
                        <span className="launch-icon">▣ + ◉</span>
                        <strong>Shared screen + remote</strong>
                        <p>Open the game on a browser/TV and use this device as its controller.</p>
                      </button>
                    )}
                    {room.supportsHandheld && (
                      <button
                        className="launch-card"
                        type="button"
                        onClick={() => navigate(`/play/${code}/controller?mode=handheld`)}
                      >
                        <span className="launch-icon">▤</span>
                        <strong>Handheld console</strong>
                        <p>
                          {room.preferredOrientation === "landscape"
                            ? "Designed for a PSP-style landscape layout."
                            : room.preferredOrientation === "portrait"
                              ? "Designed for a Game Boy-style portrait layout."
                              : "Portrait feels like Game Boy; landscape rearranges like PSP."}
                        </p>
                      </button>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </section>
            <aside className="panel members-panel panel-frame">
              <div className="section-title">
                <div>
                  <p className="eyebrow">CONNECTED</p>
                  <h2>Players</h2>
                </div>
                <span>
                  {room.activeMembers.length}/{room.maxPlayers}
                </span>
              </div>
              <ScrollArea className="panel-scroll" ariaLabel="Connected players">
                <div className="panel-scroll__content members-scroll-content">
                  <ul>
                    {room.activeMembers.map((member) => (
                      <li key={member.userId}>
                        <span className="member-dot" />
                        <strong>{member.displayName}</strong>
                        {member.userId === room.hostUserId && <small>Host</small>}
                      </li>
                    ))}
                  </ul>
                  <div className="room-actions">
                    <button
                      className="secondary-button full"
                      type="button"
                      onClick={() => void copy()}
                    >
                      Copy invite
                    </button>
                    <button
                      className="ghost-button danger full"
                      type="button"
                      onClick={() => void (isHost ? closeRoom() : exit())}
                    >
                      {isHost ? "Close room" : "Leave room"}
                    </button>
                  </div>
                </div>
              </ScrollArea>
            </aside>
          </div>
        </div>
      </ScrollArea>
    </main>
  );
}

function RoomState({ label, action }: { label: string; action?: () => void }) {
  return (
    <main className="centered-state">
      <p>{label}</p>
      {action && (
        <button className="primary-button" type="button" onClick={action}>
          Back to lobby
        </button>
      )}
    </main>
  );
}

function readError(reason: unknown): string {
  return reason instanceof Error ? reason.message : "The request could not be completed";
}
