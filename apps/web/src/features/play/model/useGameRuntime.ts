import type { ConnectionStatus } from "@play-together/browser-runtime";
import { type ControllerMode, DEFAULT_REMOTE_DISPLAY_POLICY } from "@play-together/contracts";
import { useAction } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../shared/convexApi";
import type { RoomDetails } from "../../../shared/types";
import type { RemoteDisplayLayout, RemoteRole } from "../remotePresentation";
import { mountGameRuntime } from "../runtime/mountGameRuntime";

export function useGameRuntime({
  code,
  room,
  role,
  mode,
  isPlaying,
}: {
  code: string;
  room: RoomDetails | null | undefined;
  role: RemoteRole;
  mode: ControllerMode;
  isPlaying: boolean;
}) {
  const issueTicket = useAction(api.tickets.issue);
  const mountRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Preparing room…");
  const [connection, setConnection] = useState<ConnectionStatus>("idle");
  const [error, setError] = useState("");
  const [remoteCount, setRemoteCount] = useState(0);
  const [displayLayout, setDisplayLayout] = useState<RemoteDisplayLayout>("shared");
  const presentationPolicy = room?.presentation.remoteDisplay ?? DEFAULT_REMOTE_DISPLAY_POLICY;

  useEffect(() => {
    if (isPlaying) return;
    setConnection("idle");
    setRemoteCount(0);
    setDisplayLayout("shared");
    setStatus(room ? `${room.gameTitle} · game lobby` : "Loading room…");
    mountRef.current?.replaceChildren();
  }, [isPlaying, room]);

  useEffect(() => {
    if (!isPlaying || !mountRef.current) return;
    return mountGameRuntime({
      code,
      role,
      mode,
      roomTitle: room?.gameTitle ?? "Game",
      presentationPolicy,
      mount: mountRef.current,
      issueTicket,
      onConnection: setConnection,
      onError: setError,
      onRemotePlan: (count, layout) => {
        setRemoteCount(count);
        setDisplayLayout(layout);
      },
      onStatus: setStatus,
    });
  }, [code, isPlaying, issueTicket, mode, role, room?.gameTitle, presentationPolicy]);

  return { connection, displayLayout, error, mountRef, remoteCount, status };
}
