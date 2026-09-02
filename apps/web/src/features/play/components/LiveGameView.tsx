import type { RefObject } from "react";
import { RoomInviteQr } from "../../../shared/RoomInviteQr";
import { Button } from "../../../shared/ui/Button";
import type { RemoteDisplayLayout, RemoteRole } from "../remotePresentation";

export function LiveGameView({
  code,
  role,
  remoteCount,
  displayLayout,
  inviteOpen,
  error,
  mountRef,
  onHideInvite,
}: {
  code: string;
  role: RemoteRole;
  remoteCount: number;
  displayLayout: RemoteDisplayLayout;
  inviteOpen: boolean;
  error: string;
  mountRef: RefObject<HTMLDivElement | null>;
  onHideInvite: () => void;
}) {
  const displayRemote = role === "display";
  return (
    <>
      {displayRemote && (
        <aside
          className="remote-discovery remote-discovery--found"
          data-layout={displayLayout}
          data-remote-count={remoteCount}
          aria-live="polite"
        >
          <span className="remote-discovery__radar" aria-hidden="true" />
          <div>
            <strong>
              {remoteCount} controller{remoteCount === 1 ? "" : "s"} connected
            </strong>
            <span>
              {displayLayout === "split"
                ? `${remoteCount}-way split screen selected automatically`
                : "One shared screen selected automatically"}
            </span>
          </div>
        </aside>
      )}
      {displayRemote && (inviteOpen || remoteCount === 0) && (
        <aside className="live-invite" aria-label="Join this game">
          <RoomInviteQr code={code} compact />
          {inviteOpen && remoteCount > 0 && (
            <Button variant="ghost" type="button" onClick={onHideInvite}>
              Hide invite
            </Button>
          )}
        </aside>
      )}
      {error && (
        <div className="play-error" role="alert">
          <strong>Connection issue</strong>
          <span>{error}</span>
          <button type="button" onClick={() => location.reload()}>
            Retry
          </button>
        </div>
      )}
      <section className="device-frame">
        <div className="game-mount" ref={mountRef} />
      </section>
    </>
  );
}
