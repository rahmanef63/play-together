import { RealtimeClient } from "@play-together/browser-runtime";
import type { ControllerMode } from "@play-together/contracts";
import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../shared/convexApi";
import { navigate } from "../../shared/navigation";
import { RoomInviteQr } from "../../shared/RoomInviteQr";
import type {
  CurrentUser,
  GameRegistryDocument,
  GameRegistryEntry,
  RoomDetails,
  TicketResponse,
} from "../../shared/types";
import {
  createRemoteDisplayPlan,
  inferRemoteRole,
  type PresencePlayer,
  type RemoteDisplayLayout,
  type RemoteRole,
  remoteControllers,
  resolveRemoteDisplayPolicy,
} from "./remotePresentation";

const realtimeUrl = import.meta.env.VITE_REALTIME_URL || defaultRealtimeUrl();

function defaultRealtimeUrl(): string {
  const endpoint = new URL("/api/realtime", window.location.origin);
  endpoint.protocol = endpoint.protocol === "https:" ? "wss:" : "ws:";
  return endpoint.toString();
}

export function PlayPage({
  code,
  role,
  user,
}: {
  code: string;
  role: "controller" | "display" | "auto";
  user: CurrentUser;
}) {
  const room = useQuery(api.rooms.getByCode, { code }) as RoomDetails | null | undefined;
  const issueTicket = useAction(api.tickets.issue);
  const heartbeat = useMutation(api.rooms.heartbeat);
  const startGame = useMutation(api.rooms.startGame);
  const returnToLobby = useMutation(api.rooms.returnToLobby);
  const mountRef = useRef<HTMLDivElement>(null);
  const [resolvedRole, setResolvedRole] = useState<RemoteRole>(() => resolveRole(role));
  const mode: ControllerMode =
    resolvedRole === "display"
      ? "remote"
      : new URLSearchParams(location.search).get("mode") === "handheld"
        ? "handheld"
        : "remote";
  const [status, setStatus] = useState("Preparing room…");
  const [connection, setConnection] = useState("idle");
  const [error, setError] = useState("");
  const [menuError, setMenuError] = useState("");
  const [remoteCount, setRemoteCount] = useState(0);
  const [displayLayout, setDisplayLayout] = useState<RemoteDisplayLayout>("shared");
  const [inviteOpen, setInviteOpen] = useState(false);
  const isHost = room?.hostUserId === user.id;
  const isPlaying = room?.playState === "playing";

  useEffect(() => setResolvedRole(resolveRole(role)), [role]);

  useEffect(() => {
    void heartbeat({ code });
    const timer = setInterval(() => void heartbeat({ code }), 20_000);
    return () => clearInterval(timer);
  }, [code, heartbeat]);

  useEffect(() => {
    if (isPlaying) return;
    setConnection("idle");
    setRemoteCount(0);
    setDisplayLayout("shared");
    setStatus(room ? `${room.gameTitle} · game lobby` : "Loading room…");
    mountRef.current?.replaceChildren();
  }, [isPlaying, room]);

  useEffect(() => {
    if (!isPlaying) return;
    let disposed = false;
    let client: RealtimeClient | null = null;
    let unsubscribeSnapshot: (() => void) | null = null;
    let unsubscribeMessages: (() => void) | null = null;
    let gameTitle = room?.gameTitle ?? "Game";
    let latestPresence: PresencePlayer[] = [];
    let presentationPolicy: GameRegistryEntry["presentation"]["remoteDisplay"] = {
      mode: "shared",
      maxViewports: 1,
    };
    const frame = document.createElement("iframe");
    const channel = crypto.randomUUID();
    frame.className = "game-frame";
    frame.title =
      resolvedRole === "display"
        ? "Adaptive shared game display"
        : mode === "handheld"
          ? "Handheld game console"
          : "Phone game controller";
    frame.sandbox.add("allow-scripts", "allow-pointer-lock");
    frame.allow = "fullscreen; gamepad; accelerometer; gyroscope";
    frame.src = "/game-frame.html";

    const displayStatus = (count: number, layout: RemoteDisplayLayout) => {
      if (resolvedRole !== "display") return;
      setStatus(
        `${gameTitle} · ${count} controller${count === 1 ? "" : "s"} · ${
          layout === "split" ? `${count}-way split` : "shared view"
        }`,
      );
    };

    const pushPresentation = (fallbackPlayerId: string) => {
      if (resolvedRole !== "display") return;
      const controllers = remoteControllers(latestPresence);
      const plan = createRemoteDisplayPlan({
        players: latestPresence,
        fallbackPlayerId,
        policy: presentationPolicy,
      });
      setRemoteCount(controllers.length);
      setDisplayLayout(plan.layout);
      displayStatus(controllers.length, plan.layout);
      frame.contentWindow?.postMessage(
        {
          type: "presentation",
          channel,
          layout: plan.layout,
          views: plan.playerIds.map((playerId, index) => ({
            playerId,
            label: `Player ${index + 1}`,
          })),
        },
        "*",
      );
    };

    let currentPlayerId = "";
    const onFrameMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== frame.contentWindow || !isFrameMessage(event.data, channel)) return;
      const message = event.data;
      if (message.type === "input") client?.sendInput(message.payload);
      else if (message.type === "status" && typeof message.status === "string") {
        if (resolvedRole !== "display") setStatus(message.status);
      } else if (message.type === "ready") {
        gameTitle = typeof message.title === "string" ? message.title : gameTitle;
        if (resolvedRole === "display") pushPresentation(currentPlayerId);
        else {
          setStatus(`${gameTitle} · ${mode === "handheld" ? "handheld console" : "phone remote"}`);
        }
        if (client?.latestSnapshot) {
          frame.contentWindow?.postMessage(
            { type: "snapshot", channel, snapshot: client.latestSnapshot },
            "*",
          );
        }
      } else if (message.type === "error") {
        setError(typeof message.message === "string" ? message.message : "Game surface failed");
      }
    };
    window.addEventListener("message", onFrameMessage);

    const run = async () => {
      try {
        setError("");
        setStatus(`${gameTitle} · connecting…`);
        const initial = (await issueTicket({ code, role: resolvedRole, mode })) as TicketResponse;
        currentPlayerId = initial.playerId;
        if (disposed || !mountRef.current) return;
        presentationPolicy = await readPresentationPolicy(initial.gameId, initial.gameVersion);
        const refreshTicket = async () => {
          const refreshed = (await issueTicket({
            code,
            role: resolvedRole,
            mode,
          })) as TicketResponse;
          if (
            refreshed.gameId !== initial.gameId ||
            refreshed.gameVersion !== initial.gameVersion ||
            refreshed.manifestSha256 !== initial.manifestSha256
          ) {
            throw new Error("Room game version changed unexpectedly");
          }
          return { token: refreshed.ticket, expiresAt: refreshed.expiresAt };
        };
        client = new RealtimeClient({
          baseUrl: realtimeUrl,
          initialTicket: { token: initial.ticket, expiresAt: initial.expiresAt },
          refreshTicket,
          reconnect: true,
        });
        client.onStatus((value) => setConnection(value));
        unsubscribeMessages = client.onMessage((message) => {
          if (message.type === "error") {
            setError(message.message);
            return;
          }
          if (message.type === "presence") {
            latestPresence = message.players;
            pushPresentation(initial.playerId);
          }
        });
        unsubscribeSnapshot = client.subscribe((snapshot) => {
          frame.contentWindow?.postMessage({ type: "snapshot", channel, snapshot }, "*");
        });
        frame.addEventListener(
          "load",
          () => {
            frame.contentWindow?.postMessage(
              {
                type: "init",
                channel,
                role: resolvedRole,
                mode,
                playerId: initial.playerId,
                gameId: initial.gameId,
                gameVersion: initial.gameVersion,
                manifestUrl: initial.manifestUrl,
                manifestSha256: initial.manifestSha256,
              },
              "*",
            );
            pushPresentation(initial.playerId);
          },
          { once: true },
        );
        mountRef.current.replaceChildren(frame);
        client.start();
      } catch (reason) {
        if (!disposed) setError(reason instanceof Error ? reason.message : "Game could not start");
      }
    };
    void run();
    return () => {
      disposed = true;
      unsubscribeSnapshot?.();
      unsubscribeMessages?.();
      client?.stop();
      window.removeEventListener("message", onFrameMessage);
      frame.remove();
      setConnection("idle");
    };
  }, [code, isPlaying, issueTicket, mode, resolvedRole, room?.gameTitle]);

  const fullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      if (resolvedRole === "controller" && mode === "remote" && "orientation" in screen) {
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (orientation: "landscape") => Promise<void>;
        };
        await orientation.lock?.("landscape");
      }
    } catch {
      // Fullscreen/orientation locking is capability- and gesture-dependent.
    }
  };

  const switchRemoteRole = () => {
    navigate(
      resolvedRole === "display" ? `/play/${code}/controller?mode=remote` : `/play/${code}/display`,
    );
  };

  const start = async () => {
    setMenuError("");
    try {
      await startGame({ code });
    } catch (reason) {
      setMenuError(reason instanceof Error ? reason.message : "Game could not start");
    }
  };

  const openMenu = async () => {
    setMenuError("");
    try {
      await returnToLobby({ code });
      setInviteOpen(false);
    } catch (reason) {
      setMenuError(reason instanceof Error ? reason.message : "Could not return to the game menu");
    }
  };

  if (room === null) {
    return (
      <main className="centered-state">
        <p>Room not found</p>
        <button className="primary-button" type="button" onClick={() => navigate("/")}>
          Back to lobby
        </button>
      </main>
    );
  }

  return (
    <main className={`play-page play-page--${resolvedRole} play-page--${mode}`}>
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
            <button className="ghost-button" type="button" onClick={() => void openMenu()}>
              Menu
            </button>
          )}
          {resolvedRole === "display" && mode === "remote" && (
            <button
              className="ghost-button"
              type="button"
              onClick={() => setInviteOpen((value) => !value)}
            >
              Invite
            </button>
          )}
          {mode === "remote" && (
            <button className="ghost-button" type="button" onClick={switchRemoteRole}>
              {resolvedRole === "display" ? "Use as remote" : "Use as display"}
            </button>
          )}
          {isPlaying && (
            <button className="ghost-button" type="button" onClick={() => void fullscreen()}>
              Fullscreen
            </button>
          )}
        </div>
      </header>

      {!isPlaying ? (
        <PregameMenu
          code={code}
          room={room}
          role={resolvedRole}
          mode={mode}
          isHost={Boolean(isHost)}
          error={menuError}
          onStart={() => void start()}
        />
      ) : (
        <>
          {resolvedRole === "display" && mode === "remote" && (
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
          {resolvedRole === "display" && mode === "remote" && (inviteOpen || remoteCount === 0) && (
            <aside className="live-invite" aria-label="Join this game">
              <RoomInviteQr code={code} compact />
              {inviteOpen && remoteCount > 0 && (
                <button className="ghost-button" type="button" onClick={() => setInviteOpen(false)}>
                  Hide invite
                </button>
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
      )}
    </main>
  );
}

function PregameMenu({
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
  if (!room) {
    return (
      <section className="pregame-menu pregame-menu--loading">
        <span className="pulse-dot" />
        <p>Loading game lobby…</p>
      </section>
    );
  }
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
        {role === "display" ? (
          <RoomInviteQr code={code} />
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
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="pregame-menu__actions">
          {isHost ? (
            <button className="primary-button" type="button" onClick={onStart}>
              Start Game
            </button>
          ) : (
            <span className="pregame-menu__host-note">Host controls Start Game</span>
          )}
          <button
            className="secondary-button"
            type="button"
            onClick={() => navigate(`/room/${code}`)}
          >
            Room settings
          </button>
        </div>
      </div>
    </section>
  );
}

function resolveRole(role: "controller" | "display" | "auto"): RemoteRole {
  if (role !== "auto") return role;
  return inferRemoteRole({
    width: window.innerWidth,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
  });
}

async function readPresentationPolicy(
  gameId: string,
  gameVersion: string,
): Promise<GameRegistryEntry["presentation"]["remoteDisplay"]> {
  try {
    const response = await fetch("/game-registry.json", { cache: "no-store", credentials: "omit" });
    if (!response.ok) return resolveRemoteDisplayPolicy(undefined);
    const registry = (await response.json()) as GameRegistryDocument;
    const entry = registry.games.find((game) => game.id === gameId && game.version === gameVersion);
    return resolveRemoteDisplayPolicy(entry);
  } catch {
    return resolveRemoteDisplayPolicy(undefined);
  }
}

function isFrameMessage(
  value: unknown,
  channel: string,
): value is { type: string; channel: string; [key: string]: unknown } {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { type?: unknown; channel?: unknown };
  return typeof candidate.type === "string" && candidate.channel === channel;
}
