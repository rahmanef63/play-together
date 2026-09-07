import { useCallback, useState } from "react";
import { displayCompatibilityMessage } from "../../shared/browserSupport";
import { browserPathForNavigation } from "../../shared/navigation";
import type { CurrentUser } from "../../shared/types";
import { Button } from "../../shared/ui/Button";
import { LiveGameView } from "./components/LiveGameView";
import { PlayGameMenu } from "./components/PlayGameMenu";
import { PlayToolbar } from "./components/PlayToolbar";
import { PregameMenu } from "./components/PregameMenu";
import { useGameRuntime } from "./model/useGameRuntime";
import { usePlayRoom } from "./model/usePlayRoom";
import { useScreenAwake } from "./model/useScreenAwake";

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
  const [gameMenuOpen, setGameMenuOpen] = useState(false);
  const openSystemMenu = useCallback(() => setGameMenuOpen(true), []);
  const compatibility =
    play.role === "controller" && play.mode !== "handheld" ? null : displayCompatibilityMessage();
  const runtime = useGameRuntime({
    code,
    room: play.room,
    role: play.role,
    mode: play.mode,
    isPlaying: Boolean(play.isPlaying) && !compatibility,
    onSystemMenu: openSystemMenu,
  });

  useScreenAwake(Boolean(play.isPlaying) && !compatibility);

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
        onMenu={() => setGameMenuOpen(true)}
        showMenu={play.role === "display"}
      />
      <PlayGameMenu
        code={code}
        gameTitle={play.room?.gameTitle ?? "Game"}
        gameVersion={play.room?.gameVersion ?? ""}
        open={gameMenuOpen}
        role={play.role}
        mode={play.mode}
        isPlaying={Boolean(play.isPlaying)}
        isHost={Boolean(play.isHost)}
        inviteOpen={play.inviteOpen}
        onClose={() => setGameMenuOpen(false)}
        onInvite={() => {
          play.setInviteOpen((value) => !value);
          setGameMenuOpen(false);
        }}
        onReturnToGameMenu={() => {
          setGameMenuOpen(false);
          void play.openMenu();
        }}
        onSwitchRole={play.switchRole}
      />
      {compatibility ? (
        <section className="centered-state">
          <h2>This screen needs another play mode</h2>
          <p>{compatibility}</p>
          <a className="ds-button" href="/tv.html">
            TV compatibility check
          </a>
          <Button
            type="button"
            onClick={() =>
              window.location.assign(
                browserPathForNavigation(
                  `/play/${code}/controller?mode=remote`,
                  window.location.pathname,
                ),
              )
            }
          >
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
