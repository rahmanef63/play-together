import type { ConnectionStatus } from "@play-together/browser-runtime";
import type { ControllerMode } from "@play-together/contracts";
import { navigate } from "../../../shared/navigation";
import type { RemoteRole } from "../remotePresentation";

export function PlayToolbar({
  code,
  status,
  connection,
  role,
  mode,
  isPlaying,
  isHost,
  onMenu,
  onInvite,
  onSwitchRole,
}: {
  code: string;
  status: string;
  connection: ConnectionStatus;
  role: RemoteRole;
  mode: ControllerMode;
  isPlaying: boolean;
  isHost: boolean;
  onMenu: () => void;
  onInvite: () => void;
  onSwitchRole: () => void;
}) {
  return (
    <header className="play-toolbar">
      <button className="ghost-button" type="button" onClick={() => navigate(`/room/${code}`)}>
        ← Room
      </button>
      <div>
        <strong>{status}</strong>
        <span className={`connection connection--${connection}`}>{connection}</span>
      </div>
      <div className="play-toolbar__actions">
        {isPlaying && isHost && (
          <button className="ghost-button" type="button" onClick={onMenu}>
            Menu
          </button>
        )}
        {role === "display" && mode === "remote" && (
          <button className="ghost-button" type="button" onClick={onInvite}>
            Invite
          </button>
        )}
        {mode === "remote" && (
          <button className="ghost-button" type="button" onClick={onSwitchRole}>
            <span className="play-toolbar__label--long">
              {role === "display" ? "Use as remote" : "Use as display"}
            </span>
            <span className="play-toolbar__label--short">
              {role === "display" ? "Remote" : "Display"}
            </span>
          </button>
        )}
        {isPlaying && (
          <button
            className="ghost-button play-toolbar__fullscreen"
            type="button"
            onClick={() => void requestPlayFullscreen(role, mode)}
          >
            <span className="play-toolbar__label--long">Fullscreen</span>
            <span className="play-toolbar__label--short">Full</span>
          </button>
        )}
      </div>
    </header>
  );
}

async function requestPlayFullscreen(role: RemoteRole, mode: ControllerMode) {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    if (role === "controller" && mode === "remote" && "orientation" in screen) {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: "landscape") => Promise<void>;
      };
      await orientation.lock?.("landscape");
    }
  } catch {
    // Fullscreen/orientation locking is capability- and gesture-dependent.
  }
}
