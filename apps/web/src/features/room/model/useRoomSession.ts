import { useAction, useMutation, useQuery } from "convex/react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { api } from "../../../shared/convexApi";
import { errorMessage } from "../../../shared/errors";
import { navigate } from "../../../shared/navigation";
import type { CurrentUser, RoomDetails } from "../../../shared/types";

export function useRoomSession(code: string, user: CurrentUser) {
  const room = useQuery(api.rooms.getByCode, { code }) as RoomDetails | null | undefined;
  const joinRoom = useAction(api.rooms.join);
  const heartbeat = useMutation(api.rooms.heartbeat);
  const leave = useMutation(api.rooms.leave);
  const close = useMutation(api.rooms.close);
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const joinIntent = new URLSearchParams(location.search).get("join") === "remote";
  const autoJoinAttempted = useRef(false);
  const isMember = room?.activeMembers.some((member) => member.userId === user.id) ?? false;

  useEffect(() => {
    if (!isMember) return;
    void heartbeat({ code });
    const timer = setInterval(() => void heartbeat({ code }), 20_000);
    return () => clearInterval(timer);
  }, [code, heartbeat, isMember]);

  useEffect(() => {
    if (!room || !joinIntent || autoJoinAttempted.current) return;
    if (room.activeMembers.some((member) => member.userId === user.id)) {
      autoJoinAttempted.current = true;
      navigate(`/play/${code}/controller?mode=remote`);
      return;
    }
    if (room.status !== "open" || room.requiresPassword) return;
    autoJoinAttempted.current = true;
    setBusy(true);
    setError("");
    void joinRoom({ code })
      .then((result) => {
        if (!result.ok) throw new Error(result.message);
        navigate(`/play/${code}/controller?mode=remote`);
      })
      .catch((reason: unknown) => setError(errorMessage(reason)))
      .finally(() => setBusy(false));
  }, [code, joinIntent, joinRoom, room, user.id]);

  const copyInvite = async () => {
    await navigator.clipboard.writeText(`${location.origin}/room/${code}\nRoom code: ${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1_500);
  };

  const exitRoom = async () => {
    await leave({ code });
    navigate("/");
  };

  const closeRoom = async () => {
    try {
      await close({ code });
      navigate("/");
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };

  const join = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await joinRoom(password ? { code, password } : { code });
      if (!result.ok) throw new Error(result.message);
      if (joinIntent) navigate(`/play/${code}/controller?mode=remote`);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  return {
    busy,
    closeRoom,
    copied,
    copyInvite,
    error,
    exitRoom,
    isMember,
    join,
    password,
    room,
    setPassword,
  };
}
