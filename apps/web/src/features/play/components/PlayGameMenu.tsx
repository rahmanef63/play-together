import type { ControllerMode } from "@play-together/contracts";
import { useRef } from "react";
import { navigate } from "../../../shared/navigation";
import { Button } from "../../../shared/ui/Button";
import { useMenuFocus } from "../model/useMenuFocus";
import type { RemoteRole } from "../remotePresentation";

export function PlayGameMenu({
  code,
  gameTitle,
  gameVersion,
  open,
  role,
  mode,
  isPlaying,
  isHost,
  inviteOpen,
  onClose,
  onInvite,
  onReturnToGameMenu,
  onSwitchRole,
}: {
  code: string;
  gameTitle: string;
  gameVersion: string;
  open: boolean;
  role: RemoteRole;
  mode: ControllerMode;
  isPlaying: boolean;
  isHost: boolean;
  inviteOpen: boolean;
  onClose: () => void;
  onInvite: () => void;
  onReturnToGameMenu: () => void;
  onSwitchRole: () => void;
}) {
  const menuRef = useRef<HTMLElement>(null);
  useMenuFocus(open, menuRef, onClose);
  if (!open) return null;
  return (
    <div className="play-game-menu-layer" onPointerDown={onClose}>
      <aside
        ref={menuRef}
        className="play-game-menu"
        role="dialog"
        aria-modal="true"
        aria-label={`${gameTitle} menu`}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <strong>{gameTitle}</strong>
            <span>{gameVersion}</span>
          </div>
          <Button variant="ghost" type="button" onClick={onClose} aria-label="Close game menu">
            ×
          </Button>
        </header>
        <div className="play-game-menu__actions">
          {role === "display" && mode === "remote" && (
            <Button variant="ghost" type="button" onClick={onInvite}>
              {inviteOpen ? "Hide invite QR" : "Invite controllers"}
            </Button>
          )}
          {mode === "remote" && (
            <Button variant="ghost" type="button" onClick={onSwitchRole}>
              {role === "display" ? "Use this screen as remote" : "Use this screen as display"}
            </Button>
          )}
          {isPlaying && (
            <Button variant="ghost" type="button" onClick={() => void toggleFullscreen(role, mode)}>
              {document.fullscreenElement ? "Exit fullscreen" : "Fullscreen"}
            </Button>
          )}
          {isPlaying && isHost && (
            <Button variant="ghost" type="button" onClick={onReturnToGameMenu}>
              Return to game menu
            </Button>
          )}
          <Button variant="ghost" type="button" onClick={() => navigate(`/room/${code}`)}>
            Room details
          </Button>
        </div>
      </aside>
    </div>
  );
}

async function toggleFullscreen(role: RemoteRole, mode: ControllerMode) {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
    if (
      document.fullscreenElement &&
      role === "controller" &&
      mode === "remote" &&
      "orientation" in screen
    ) {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: "landscape") => Promise<void>;
      };
      await orientation.lock?.("landscape");
    }
  } catch {
    // Fullscreen and orientation locks remain user-gesture/capability dependent.
  }
}
