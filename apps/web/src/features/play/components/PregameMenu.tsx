import type { ControllerMode } from "@play-together/contracts";
import { navigate } from "../../../shared/navigation";
import { RoomInviteQr } from "../../../shared/RoomInviteQr";
import type { RoomDetails } from "../../../shared/types";
import { Button } from "../../../shared/ui/Button";
import { FormMessage } from "../../../shared/ui/FormMessage";
import type { RemoteRole } from "../remotePresentation";

export function PregameMenu({
  code,
  room,
  role,
  mode,
  isHost,
  error,
  onStart,
}: {
  code: string;
  room: RoomDetails | undefined;
  role: RemoteRole;
  mode: ControllerMode;
  isHost: boolean;
  error: string;
  onStart: () => void;
}) {
  if (!room)
    return (
      <section className="pregame-menu pregame-menu--loading">
        <span className="pulse-dot" />
        <p>Loading game lobby…</p>
      </section>
    );
  const modeLabel =
    role === "display"
      ? "Remote party · auto shared/split"
      : mode === "handheld"
        ? "Handheld console"
        : "Phone remote controller";
  return (
    <section className={`pregame-menu pregame-menu--${role}`} data-play-state={room.playState}>
      <div className="pregame-menu__panel">
        <div className="pregame-menu__heading">
          <p className="eyebrow">GAME LOBBY</p>
          <h1>{room.gameTitle}</h1>
          <p>{room.name}</p>
        </div>
        <div className="pregame-menu__settings">
          <div>
            <span>MODE</span>
            <strong>{modeLabel}</strong>
          </div>
          <div>
            <span>PLAYERS</span>
            <strong>
              {room.activeMembers.length}/{room.maxPlayers}
            </strong>
          </div>
          <div>
            <span>VERSION</span>
            <strong>{room.gameVersion}</strong>
          </div>
        </div>
        {role === "display" || isHost ? (
          <RoomInviteQr code={code} compact={role !== "display"} />
        ) : (
          <div className="pregame-waiting">
            <span className="pregame-waiting__icon" aria-hidden="true">
              ◉
            </span>
            <div>
              <strong>{isHost ? "Ready when you are" : "Waiting for host"}</strong>
              <span>
                {isHost
                  ? "Start when everyone has joined. The game has not started yet."
                  : "Stay on this screen. Your controller will open automatically when the host starts."}
              </span>
            </div>
          </div>
        )}
        {error && <FormMessage>{error}</FormMessage>}
        <div className="pregame-menu__actions">
          {isHost ? (
            <Button type="button" onClick={onStart}>
              Start Game
            </Button>
          ) : (
            <span className="pregame-menu__host-note">Host controls Start Game</span>
          )}
          <Button variant="secondary" type="button" onClick={() => navigate(`/room/${code}`)}>
            Room settings
          </Button>
        </div>
      </div>
    </section>
  );
}
