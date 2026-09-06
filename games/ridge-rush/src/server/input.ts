import { clamp, finite, type RiderInput } from "./model.js";
export interface ParsedInput {
  input: RiderInput;
  readyRequested: boolean;
}
const BOOLEAN_FIELDS = ["pedal", "brake", "jump", "attack"] as const;
export function parseInput(payload: unknown, current: RiderInput): ParsedInput | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return null;
  const data = payload as Record<string, unknown>;
  const allowed = new Set(["steer", "body", "pedal", "brake", "jump", "attack", "action"]);
  if (Object.keys(data).some((key) => !allowed.has(key))) return null;
  if (data.action !== undefined) {
    if (data.action !== "ready" || Object.keys(data).some((key) => key !== "action")) return null;
    return { input: { ...current }, readyRequested: true };
  }
  for (const key of ["steer", "body"] as const)
    if (data[key] !== undefined && !finite(data[key])) return null;
  for (const key of BOOLEAN_FIELDS)
    if (data[key] !== undefined && typeof data[key] !== "boolean") return null;
  const next = { ...current };
  if (data.steer !== undefined) next.steer = clamp(data.steer as number, -1, 1);
  if (data.body !== undefined) next.body = clamp(data.body as number, -1, 1);
  for (const key of BOOLEAN_FIELDS) if (data[key] !== undefined) next[key] = data[key] as boolean;
  return { input: next, readyRequested: false };
}
