import type { Id } from "../../_generated/dataModel";
import type { RoomAdmissionFailure } from "../roomAdmission";

export const PRESENCE_TTL_MS = 45_000;

export interface RoomActionResult {
  code: string;
  roomId: Id<"rooms">;
}
export interface JoinRoomSuccess extends RoomActionResult {
  ok: true;
}
export interface JoinRoomFailure {
  ok: false;
  error: "ROOM_NOT_FOUND" | "WRONG_PASSWORD" | RoomAdmissionFailure["error"];
  message: string;
}
export type JoinRoomResult = JoinRoomSuccess | JoinRoomFailure;
export type JoinInternalResult = JoinRoomSuccess | RoomAdmissionFailure;

export interface CreateRoomArgs {
  name: string;
  gameId: string;
  gameVersion: string;
  visibility: "public" | "private";
  password?: string;
  maxPlayers: number;
}
export interface CreateRoomInternalArgs {
  code: string;
  name: string;
  hostUserId: Id<"users">;
  gameId: string;
  gameVersion: string;
  gameTitle: string;
  manifestUrl: string;
  manifestSha256: string;
  gameModes: Array<"shared-screen" | "handheld">;
  supportsRemote: boolean;
  supportsHandheld: boolean;
  preferredOrientation: "portrait" | "landscape" | "adaptive";
  remoteDisplayMode: "shared" | "per-player";
  maxViewports: number;
  visibility: "public" | "private";
  passwordHash?: string;
  maxPlayers: number;
}
export interface UpdateRoomArgs {
  code: string;
  name: string;
  visibility: "public" | "private";
  maxPlayers: number;
  passwordMode: "keep" | "set" | "remove";
  password?: string;
}
export interface UpdateRoomInternalArgs {
  roomId: Id<"rooms">;
  hostUserId: Id<"users">;
  name: string;
  visibility: "public" | "private";
  maxPlayers: number;
  removePassword: boolean;
  passwordHash?: string;
}
