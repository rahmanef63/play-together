import type { FormEvent } from "react";
import { navigate } from "../../../shared/navigation";
import { ScrollArea } from "../../../shared/ScrollArea";
import type { RoomDetails } from "../../../shared/types";

export function RoomInviteView({
  room,
  password,
  busy,
  error,
  onPasswordChange,
  onJoin,
}: {
  room: RoomDetails;
  password: string;
  busy: boolean;
  error: string;
  onPasswordChange: (value: string) => void;
  onJoin: (event: FormEvent<HTMLFormElement>) => void;
}) {
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
              <form onSubmit={onJoin}>
                {room.requiresPassword && (
                  <label className="field">
                    <span>Room password</span>
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => onPasswordChange(event.target.value)}
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
              <button className="secondary-button full" type="button" onClick={() => navigate("/")}>
                This room has closed
              </button>
            )}
          </section>
        </div>
      </ScrollArea>
    </main>
  );
}
