import { clamp } from "../shared/catalog.js";
import type { InputState, Racer } from "./raceModel.js";
export type KartAction =
  | { type: "start" | "ready" | "camera" | "rescue" | "pause" }
  | { type: "item"; direction: "forward" | "backward" };
export function applyControlPatch(racer: Racer, payload: unknown): KartAction | null {
  if (typeof payload !== "object" || payload === null) return null;
  const data = payload as Record<string, unknown>;
  const action = readAction(data);
  if (action) return action;
  for (const field of ["steer", "menuY", "throttle", "brake"] as const) {
    const value = data[field];
    if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value))) return null;
  }
  for (const field of ["drift", "rearView"] as const)
    if (data[field] !== undefined && typeof data[field] !== "boolean") return null;
  const input: InputState = { ...racer.input };
  if (typeof data.steer === "number") input.steer = clamp(data.steer, -1, 1);
  if (typeof data.menuY === "number") input.menuY = clamp(data.menuY, -1, 1);
  if (typeof data.throttle === "number") input.throttle = clamp(data.throttle, 0, 1);
  if (typeof data.brake === "number") input.brake = clamp(data.brake, 0, 1);
  if (typeof data.drift === "boolean") input.drift = data.drift;
  if (typeof data.rearView === "boolean") input.rearView = data.rearView;
  racer.input = input;
  racer.rearView = input.rearView;
  return null;
}
function readAction(data: Record<string, unknown>): KartAction | null {
  if (
    data.action === "start" ||
    data.action === "ready" ||
    data.action === "camera" ||
    data.action === "rescue" ||
    data.action === "pause"
  )
    return { type: data.action };
  if (data.action === "item" && (data.direction === "forward" || data.direction === "backward"))
    return { type: "item", direction: data.direction };
  return null;
}
