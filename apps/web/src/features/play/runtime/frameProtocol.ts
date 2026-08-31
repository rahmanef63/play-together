import type { ControllerMode } from "@play-together/contracts";
import type { RemoteRole } from "../remotePresentation";

export function createGameFrame(
  role: RemoteRole,
  mode: ControllerMode,
  channel: string,
): HTMLIFrameElement {
  const frame = document.createElement("iframe");
  frame.className = "game-frame";
  frame.title =
    role === "display"
      ? "Adaptive shared game display"
      : mode === "handheld"
        ? "Handheld game console"
        : "Phone game controller";
  frame.sandbox.add("allow-scripts", "allow-pointer-lock");
  frame.allow = "fullscreen; gamepad; accelerometer; gyroscope";
  frame.src = "/game-frame.html";
  frame.dataset.channel = channel;
  return frame;
}

export function isFrameMessage(
  value: unknown,
  channel: string,
): value is { type: string; channel: string; [key: string]: unknown } {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { type?: unknown; channel?: unknown };
  return typeof candidate.type === "string" && candidate.channel === channel;
}
