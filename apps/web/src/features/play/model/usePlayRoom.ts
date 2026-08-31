import type { ControllerMode } from "@play-together/contracts";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../shared/convexApi";
import { navigate } from "../../../shared/navigation";
import type { CurrentUser, RoomDetails } from "../../../shared/types";
import { inferRemoteRole, type RemoteRole } from "../remotePresentation";

export function usePlayRoom(
  code: string,
  requestedRole: "controller" | "display" | "auto",
  user: CurrentUser,
) {
  const room = useQuery(api.rooms.getByCode, { code }) as RoomDetails | null | undefined;
  const heartbeat = useMutation(api.rooms.heartbeat);
  const startGame = useMutation(api.rooms.startGame);
  const returnToLobby = useMutation(api.rooms.returnToLobby);
  const [role, setRole] = useState<RemoteRole>(() => resolveRole(requestedRole));
  const [menuError, setMenuError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const mode: ControllerMode =
    role === "display"
      ? "remote"
      : new URLSearchParams(location.search).get("mode") === "handheld"
        ? "handheld"
        : "remote";

  useEffect(() => setRole(resolveRole(requestedRole)), [requestedRole]);
  useEffect(() => {
    void heartbeat({ code });
    const timer = setInterval(() => void heartbeat({ code }), 20_000);
    return () => clearInterval(timer);
  }, [code, heartbeat]);

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
  const switchRole = () =>
    navigate(role === "display" ? `/play/${code}/controller?mode=remote` : `/play/${code}/display`);

  return {
    inviteOpen,
    isHost: room?.hostUserId === user.id,
    isPlaying: room?.playState === "playing",
    menuError,
    mode,
    openMenu,
    role,
    room,
    setInviteOpen,
    start,
    switchRole,
  };
}

function resolveRole(role: "controller" | "display" | "auto"): RemoteRole {
  if (role !== "auto") return role;
  return inferRemoteRole({
    width: window.innerWidth,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
  });
}
