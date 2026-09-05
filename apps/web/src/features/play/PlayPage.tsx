import { displayCompatibilityMessage } from "../../shared/browserSupport";
import type { CurrentUser } from "../../shared/types";
import { Button } from "../../shared/ui/Button";
import { LiveGameView } from "./components/LiveGameView";
import { PlayToolbar } from "./components/PlayToolbar";
import { PregameMenu } from "./components/PregameMenu";
import { useGameRuntime } from "./model/useGameRuntime";
import { usePlayRoom } from "./model/usePlayRoom";

export function PlayPage({
  code,
  role: requestedRole,
  user,
}: {
  code: string;
  role: "controller" | "display" | "auto";
  user: CurrentUser;
}) {
  const play = usePlayRoom(code, requestedRole, user);
  const compatibility =
    play.role === "controller" && play.mode !== "handheld" ? null : displayCompatibilityMessage();
  const runtime = useGameRuntime({
    code,
    room: play.room,
    role: play.role,
    mode: play.mode,
    isPlaying: Boolean(play.isPlaying) && !compatibility,
  });

  if (play.room === null)
    return (
      <main className="centered-state">
        <p>Room not found</p>
        <Button type="button" onClick={() => location.assign("/")}>
          Back to lobby
        </Button>
      </main>
    );
  return (
    <main className={`play-page play-page--${play.role} play-page--${play.mode}`}>
      <PlayToolbar
        code={code}
        status={runtime.status}
        connection={runtime.connection}
        role={play.role}
        mode={play.mode}
        isPlaying={Boolean(play.isPlaying)}
        isHost={Boolean(play.isHost)}
        onMenu={() => void play.openMenu()}
        onInvite={() => play.setInviteOpen((value) => !value)}
        onSwitchRole={play.switchRole}
      />
      {compatibility ? (
        <section className="centered-state">
          <h2>This screen needs another play mode</h2>
          <p>{compatibility}</p>
          <a className="ds-button" href="/tv.html">
            TV compatibility check
          </a>
          <Button type="button" onClick={play.switchRole}>
            Use as remote
          </Button>
        </section>
      ) : !play.isPlaying ? (
        <PregameMenu
          code={code}
          room={play.room ?? undefined}
          role={play.role}
          mode={play.mode}
          isHost={Boolean(play.isHost)}
          error={play.menuError}
          onStart={() => void play.start()}
        />
      ) : (
        <LiveGameView
          code={code}
          role={play.role}
          remoteCount={runtime.remoteCount}
          displayLayout={runtime.displayLayout}
          inviteOpen={play.inviteOpen}
          error={runtime.error}
          mountRef={runtime.mountRef}
          onHideInvite={() => play.setInviteOpen(false)}
        />
      )}
    </main>
  );
}
