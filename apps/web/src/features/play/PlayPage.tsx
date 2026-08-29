import { RealtimeClient } from "@play-together/browser-runtime";
import type { ControllerMode } from "@play-together/contracts";
import { useAction, useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../shared/convexApi";
import { navigate } from "../../shared/navigation";
import type { TicketResponse } from "../../shared/types";

const realtimeUrl = import.meta.env.VITE_REALTIME_URL || "ws://127.0.0.1:8787/v1/connect";

export function PlayPage({ code, role }: { code: string; role: "controller" | "display" }) {
  const issueTicket = useAction(api.tickets.issue);
  const heartbeat = useMutation(api.rooms.heartbeat);
  const mountRef = useRef<HTMLDivElement>(null);
  const mode: ControllerMode =
    role === "display"
      ? "remote"
      : new URLSearchParams(location.search).get("mode") === "handheld"
        ? "handheld"
        : "remote";
  const [status, setStatus] = useState("Preparing secure session…");
  const [connection, setConnection] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    void heartbeat({ code });
    const timer = setInterval(() => void heartbeat({ code }), 20_000);
    return () => clearInterval(timer);
  }, [code, heartbeat]);

  useEffect(() => {
    let disposed = false;
    let client: RealtimeClient | null = null;
    let unsubscribeSnapshot: (() => void) | null = null;
    const frame = document.createElement("iframe");
    const channel = crypto.randomUUID();
    frame.className = "game-frame";
    frame.title =
      role === "display"
        ? "Shared game display"
        : mode === "handheld"
          ? "Handheld game console"
          : "Phone game controller";
    frame.sandbox.add("allow-scripts", "allow-pointer-lock");
    frame.allow = "fullscreen; gamepad; accelerometer; gyroscope";
    frame.src = "/game-frame.html";

    const onFrameMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== frame.contentWindow || !isFrameMessage(event.data, channel)) return;
      const message = event.data;
      if (message.type === "input") client?.sendInput(message.payload);
      else if (message.type === "status" && typeof message.status === "string") {
        setStatus(message.status);
      } else if (message.type === "ready") {
        setStatus(
          `${typeof message.title === "string" ? message.title : "Game"} · ${
            mode === "handheld"
              ? "handheld console"
              : role === "display"
                ? "shared screen"
                : "phone remote"
          }`,
        );
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
        const initial = (await issueTicket({ code, role, mode })) as TicketResponse;
        if (disposed || !mountRef.current) return;
        const refreshTicket = async () => {
          const refreshed = (await issueTicket({ code, role, mode })) as TicketResponse;
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
        client.onMessage((message) => {
          if (message.type === "error") setError(message.message);
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
                role,
                mode,
                playerId: initial.playerId,
                gameId: initial.gameId,
                gameVersion: initial.gameVersion,
                manifestUrl: initial.manifestUrl,
                manifestSha256: initial.manifestSha256,
              },
              "*",
            );
          },
          { once: true },
        );
        mountRef.current.replaceChildren(frame);
        client.start();
      } catch (reason) {
        if (!disposed) {
          setError(reason instanceof Error ? reason.message : "Game could not start");
        }
      }
    };
    void run();
    return () => {
      disposed = true;
      unsubscribeSnapshot?.();
      client?.stop();
      window.removeEventListener("message", onFrameMessage);
      frame.remove();
    };
  }, [code, issueTicket, mode, role]);

  const fullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {}
  };

  return (
    <main className={`play-page play-page--${role} play-page--${mode}`}>
      <header className="play-toolbar">
        <button className="ghost-button" type="button" onClick={() => navigate(`/room/${code}`)}>
          ← Room
        </button>
        <div>
          <strong>{status}</strong>
          <span className={`connection connection--${connection}`}>{connection}</span>
        </div>
        <button className="ghost-button" type="button" onClick={() => void fullscreen()}>
          Fullscreen
        </button>
      </header>
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
    </main>
  );
}

function isFrameMessage(
  value: unknown,
  channel: string,
): value is { type: string; channel: string; [key: string]: unknown } {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { type?: unknown; channel?: unknown };
  return typeof candidate.type === "string" && candidate.channel === channel;
}
