import type { ConsoleAction } from "@play-together/contracts";
import type { BrowserGameContext } from "@play-together/game-sdk";
import type { Cleanup, MutableState, Variables } from "./types";

export function runAction(
  action: ConsoleAction,
  state: MutableState,
  context: BrowserGameContext,
  variables: Variables = {},
): void {
  switch (action.type) {
    case "send":
      context.sendInput(resolveTemplate(action.payload, variables) as Record<string, unknown>);
      break;
    case "patch":
      Object.assign(state, resolveTemplate(action.values, variables));
      context.sendInput({ ...state });
      break;
    case "toggle":
      state[action.field] = !state[action.field];
      context.sendInput({ ...state });
      break;
    case "increment": {
      const current = Number(state[action.field] ?? 0);
      state[action.field] = clamp(
        current + action.delta,
        action.min ?? Number.NEGATIVE_INFINITY,
        action.max ?? Number.POSITIVE_INFINITY,
      );
      context.sendInput({ ...state });
      break;
    }
    case "pulse":
      Object.assign(state, resolveTemplate(action.values, variables));
      context.sendInput({ ...state });
      window.setTimeout(() => {
        Object.assign(state, resolveTemplate(action.releaseValues, variables));
        context.sendInput({ ...state });
      }, action.durationMs);
      break;
  }
}

export function bindKeys(keys: string[], down: () => void, up: () => void): Cleanup {
  if (!keys.length) return () => undefined;
  const keySet = new Set(keys);
  const active = new Set<string>();
  const keydown = (event: KeyboardEvent) => {
    if (!(keySet.has(event.code) || keySet.has(event.key)) || active.has(event.code)) return;
    active.add(event.code);
    down();
  };
  const keyup = (event: KeyboardEvent) => {
    if (!(keySet.has(event.code) || keySet.has(event.key))) return;
    active.delete(event.code);
    up();
  };
  window.addEventListener("keydown", keydown);
  window.addEventListener("keyup", keyup);
  return () => {
    window.removeEventListener("keydown", keydown);
    window.removeEventListener("keyup", keyup);
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveTemplate(value: unknown, variables: Variables): unknown {
  if (typeof value === "string" && value.startsWith("$")) {
    const key = value.slice(1);
    return Object.hasOwn(variables, key) ? variables[key] : value;
  }
  if (Array.isArray(value)) return value.map((item) => resolveTemplate(item, variables));
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveTemplate(item, variables)]),
    );
  }
  return value;
}
