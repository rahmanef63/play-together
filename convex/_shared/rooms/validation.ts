import { ConvexError } from "convex/values";

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function randomRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length]).join("");
}
export function cleanRoomName(value: string): string {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 64)
    throw new ConvexError({
      code: "INVALID_ROOM_NAME",
      message: "Room name must be 2–64 characters",
    });
  return name;
}
export function validateRoomPassword(value: string | undefined): string | undefined {
  const password = value?.trim() || undefined;
  if (password && (password.length < 4 || password.length > 64))
    throw new ConvexError({
      code: "INVALID_ROOM_PASSWORD",
      message: "Room password must be 4–64 characters",
    });
  return password;
}
