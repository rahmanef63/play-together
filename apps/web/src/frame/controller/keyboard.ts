import type { ConsoleControl } from "@play-together/contracts";
import type { Cleanup } from "./types";

function editable(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return Boolean(
    element?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(element?.tagName ?? ""),
  );
}

/** One logical press can have several keyboard aliases held at the same time. */
export function bindKeys(keys: string[], down: () => void, up: () => void): Cleanup {
  const accepted = new Set(keys);
  const active = new Set<string>();
  const reset = () => {
    if (active.size) {
      active.clear();
      up();
    }
  };
  const keydown = (event: KeyboardEvent) => {
    if (
      (event.defaultPrevented && (event.target as HTMLElement | null)?.tagName === "BUTTON") ||
      editable(event.target) ||
      !(accepted.has(event.code) || accepted.has(event.key))
    )
      return;
    event.preventDefault();
    if (active.has(event.code)) return;
    const first = active.size === 0;
    active.add(event.code);
    if (first) down();
  };
  const keyup = (event: KeyboardEvent) => {
    if (!active.delete(event.code)) return;
    event.preventDefault();
    if (!active.size) up();
  };
  const hidden = () => {
    if (document.hidden) reset();
  };
  window.addEventListener("keydown", keydown);
  window.addEventListener("keyup", keyup);
  window.addEventListener("blur", reset);
  document.addEventListener("visibilitychange", hidden);
  return () => {
    reset();
    window.removeEventListener("keydown", keydown);
    window.removeEventListener("keyup", keyup);
    window.removeEventListener("blur", reset);
    document.removeEventListener("visibilitychange", hidden);
  };
}

type Direction = "up" | "down" | "left" | "right";
type Stick = Extract<ConsoleControl, { kind: "stick" }>;
export function directionVector(directions: Iterable<Direction>): [number, number] {
  const held = new Set(directions);
  return [
    Number(held.has("right")) - Number(held.has("left")),
    Number(held.has("up")) - Number(held.has("down")),
  ];
}
export function bindDirections(
  keys: Stick["keys"],
  change: (x: number, y: number) => void,
): Cleanup {
  const held = new Set<Direction>();
  const cleanups = (["up", "down", "left", "right"] as const).map((direction) =>
    bindKeys(
      keys?.[direction] ?? [],
      () => {
        held.add(direction);
        change(...directionVector(held));
      },
      () => {
        held.delete(direction);
        change(...directionVector(held));
      },
    ),
  );
  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}
