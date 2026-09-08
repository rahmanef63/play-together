import { SURGE_COST } from "../shared/moves.js";
import { clamp, type Fighter, type Input, type Move } from "./model.js";

const keys = ["a", "b", "xButton", "yButton", "start"] as const;
export function parseInput(payload: unknown, current: Input): Input | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const p = payload as Record<string, unknown>;
  if (Object.keys(p).some((k) => !["x", "y", ...keys].includes(k))) return null;
  for (const k of ["x", "y"] as const)
    if (p[k] !== undefined && (!Number.isFinite(p[k]) || typeof p[k] !== "number")) return null;
  for (const k of keys) if (p[k] !== undefined && typeof p[k] !== "boolean") return null;
  return {
    x: p.x === undefined ? current.x : clamp(p.x as number, -1, 1),
    y: p.y === undefined ? current.y : clamp(p.y as number, -1, 1),
    a: p.a === undefined ? current.a : (p.a as boolean),
    b: p.b === undefined ? current.b : (p.b as boolean),
    xButton: p.xButton === undefined ? current.xButton : (p.xButton as boolean),
    yButton: p.yButton === undefined ? current.yButton : (p.yButton as boolean),
    start: p.start === undefined ? current.start : (p.start as boolean),
  };
}
export function bufferMove(f: Fighter): void {
  const i = f.input,
    p = f.previous;
  let m: Move = null;
  if (i.a && i.b && !(p.a && p.b)) m = "throw";
  else if (i.xButton && !p.xButton) m = i.y < -0.45 ? "sweep" : "launcher";
  else if (i.yButton && !p.yButton && f.meter >= SURGE_COST) m = "special";
  else if (i.b && !p.b) m = "kick";
  else if (i.a && !p.a) m = "jab";
  if (m) {
    f.buffer = m;
    f.bufferFrames = 8;
  }
  f.previous = { ...i };
}
