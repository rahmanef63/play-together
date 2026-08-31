import type { ControllerMode, SnapshotMessage } from "@play-together/contracts";

export interface FrameInitMessage {
  type: "init";
  channel: string;
  role: "controller" | "display";
  mode: ControllerMode;
  playerId: string;
  gameId: string;
  gameVersion: string;
  manifestUrl: string;
  manifestSha256: string;
}
export interface FrameSnapshotMessage {
  type: "snapshot";
  channel: string;
  snapshot: SnapshotMessage;
}
export interface FramePresentationMessage {
  type: "presentation";
  channel: string;
  layout: "shared" | "split";
  views: Array<{ playerId: string; label: string }>;
}
export type ParentMessage = FrameInitMessage | FrameSnapshotMessage | FramePresentationMessage;

export function isParentMessage(value: unknown): value is ParentMessage {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { type?: unknown; channel?: unknown };
  return (
    typeof candidate.channel === "string" &&
    (candidate.type === "init" ||
      candidate.type === "snapshot" ||
      candidate.type === "presentation")
  );
}
