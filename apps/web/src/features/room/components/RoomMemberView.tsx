import { navigate } from "../../../shared/navigation";
import { ScrollArea } from "../../../shared/ScrollArea";
import type { RoomDetails } from "../../../shared/types";
import { Button } from "../../../shared/ui/Button";
import { StatusBadge } from "../../../shared/ui/StatusBadge";
import { LaunchPanel } from "./LaunchPanel";
import { MembersPanel } from "./MembersPanel";

export function RoomMemberView({
  code,
  room,
  copied,
  error,
  isHost,
  onCopy,
  onExit,
}: {
  code: string;
  room: RoomDetails;
  copied: boolean;
  error: string;
  isHost: boolean;
  onCopy: () => void;
  onExit: () => void;
}) {
  return (
    <main className="room-page">
      <header className="room-header">
        <Button variant="ghost" type="button" onClick={() => navigate("/")}>
          ← Lobby
        </Button>
        <StatusBadge>{room.status}</StatusBadge>
      </header>
      <ScrollArea className="room-page-scroll" ariaLabel="Room details">
        <div className="room-page-scroll__content">
          <section className="room-identity">
            <p className="eyebrow">
              {room.gameTitle} · {room.gameVersion}
            </p>
            <h1>{room.name}</h1>
            <button className="room-code" type="button" onClick={onCopy}>
              <span>ROOM CODE</span>
              <strong>{code}</strong>
              <small>{copied ? "Copied" : "Tap to copy"}</small>
            </button>
          </section>
          {error && <p className="global-error">{error}</p>}
          <div className="room-layout">
            <LaunchPanel code={code} room={room} />
            <MembersPanel room={room} isHost={isHost} onCopy={onCopy} onExit={onExit} />
          </div>
        </div>
      </ScrollArea>
    </main>
  );
}
