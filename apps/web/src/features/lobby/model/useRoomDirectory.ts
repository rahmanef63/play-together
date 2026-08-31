import { useAction, useMutation, useQuery } from "convex/react";
import { type FormEvent, useEffect, useState } from "react";
import { api } from "../../../shared/convexApi";
import { errorMessage } from "../../../shared/errors";
import { navigate } from "../../../shared/navigation";
import type { GameSummary, MyRoomSummary, RoomSummary } from "../../../shared/types";

export function useRoomDirectory(gameById: Map<string, GameSummary>) {
  const roomsResult = useQuery(api.rooms.listPublic) as RoomSummary[] | undefined;
  const myRoomsResult = useQuery(api.rooms.listMine) as MyRoomSummary[] | undefined;
  const createRoom = useAction(api.rooms.create);
  const joinRoom = useAction(api.rooms.join);
  const updateRoom = useAction(api.rooms.update);
  const removeRoom = useMutation(api.rooms.remove);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [roomTab, setRoomTab] = useState<"public" | "mine">("public");
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [deleteCode, setDeleteCode] = useState<string | null>(null);

  useEffect(() => {
    if (!deleteCode) return;
    const timer = setTimeout(() => setDeleteCode(null), 5_000);
    return () => clearTimeout(timer);
  }, [deleteCode]);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const [gameId, gameVersion] = String(data.get("game") ?? "").split("@");
    const game = gameById.get(`${gameId}@${gameVersion}`);
    try {
      if (!gameId || !gameVersion || !game) throw new Error("Choose a published game");
      const password = String(data.get("password") ?? "").trim();
      const visibility = data.get("visibility") === "private" ? "private" : "public";
      const base = {
        name: String(data.get("name") ?? ""),
        gameId,
        gameVersion,
        visibility: visibility as "public" | "private",
        maxPlayers: Number(data.get("maxPlayers") || game.maxPlayers),
      };
      const result = await createRoom(password ? { ...base, password } : base);
      navigate(`/room/${result.code}`);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const onJoin = async (code = joinCode, password = joinPassword) => {
    if (!code.trim()) return;
    setBusy(true);
    setError("");
    try {
      const normalizedCode = code.trim().toUpperCase();
      const result = await joinRoom(
        password ? { code: normalizedCode, password } : { code: normalizedCode },
      );
      if (!result.ok) throw new Error(result.message);
      navigate(`/room/${result.code}`);
    } catch (reason) {
      setError(errorMessage(reason));
      setJoinCode(code.toUpperCase());
    } finally {
      setBusy(false);
    }
  };

  const onUpdate = async (event: FormEvent<HTMLFormElement>, room: MyRoomSummary) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const passwordMode = String(data.get("passwordMode") ?? "keep") as "keep" | "set" | "remove";
    const password = String(data.get("password") ?? "").trim();
    try {
      await updateRoom({
        code: room.code,
        name: String(data.get("name") ?? room.name),
        visibility: data.get("visibility") === "private" ? "private" : "public",
        maxPlayers: Number(data.get("maxPlayers") ?? room.maxPlayers),
        passwordMode,
        ...(passwordMode === "set" ? { password } : {}),
      });
      setEditingCode(null);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (room: MyRoomSummary) => {
    if (deleteCode !== room.code) {
      setDeleteCode(room.code);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await removeRoom({ code: room.code });
      setDeleteCode(null);
      if (editingCode === room.code) setEditingCode(null);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  return {
    busy,
    deleteCode,
    editingCode,
    error,
    joinCode,
    joinPassword,
    myRooms: myRoomsResult ?? [],
    myRoomsResult,
    onCreate,
    onDelete,
    onJoin,
    onUpdate,
    roomTab,
    rooms: roomsResult ?? [],
    roomsResult,
    setEditingCode,
    setJoinCode,
    setJoinPassword,
    setRoomTab,
  };
}
