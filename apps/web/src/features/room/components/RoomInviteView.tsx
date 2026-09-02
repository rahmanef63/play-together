import type { FormEvent } from "react";
import { navigate } from "../../../shared/navigation";
import { ScrollArea } from "../../../shared/ScrollArea";
import type { RoomDetails } from "../../../shared/types";
import { Button } from "../../../shared/ui/Button";
import { FormField } from "../../../shared/ui/FormField";
import { FormMessage } from "../../../shared/ui/FormMessage";
import { StatusBadge } from "../../../shared/ui/StatusBadge";

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
        <Button variant="ghost" type="button" onClick={() => navigate("/")}>
          ← Lobby
        </Button>
        <StatusBadge>{room.visibility}</StatusBadge>
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
                  <FormField
                    label="Room password"
                    control={
                      <input
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => onPasswordChange(event.target.value)}
                        minLength={4}
                        maxLength={64}
                        required
                      />
                    }
                  />
                )}
                {error && <FormMessage>{error}</FormMessage>}
                <Button type="submit" fullWidth busy={busy}>
                  {busy ? "Joining…" : "Join room"}
                </Button>
              </form>
            ) : (
              <Button variant="secondary" type="button" fullWidth onClick={() => navigate("/")}>
                This room has closed
              </Button>
            )}
          </section>
        </div>
      </ScrollArea>
    </main>
  );
}
