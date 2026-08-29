export const roomAdmissionMessages = {
  ROOM_CLOSED: "Room is closed",
  ROOM_FULL: "Room is full",
  USER_NOT_FOUND: "User not found",
} as const;

export type RoomAdmissionCode = keyof typeof roomAdmissionMessages;

export interface RoomAdmissionFailure {
  ok: false;
  error: RoomAdmissionCode;
  message: string;
}

export function roomAdmissionFailure(code: RoomAdmissionCode): RoomAdmissionFailure {
  return { ok: false, error: code, message: roomAdmissionMessages[code] };
}
