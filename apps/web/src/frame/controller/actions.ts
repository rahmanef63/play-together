import type { ConsoleAction } from "@play-together/contracts";
import type { BrowserGameContext } from "@play-together/game-sdk";
import type { MutableState, Variables } from "./types";

const pulseTimers = new WeakMap<MutableState, Map<ConsoleAction, number>>();

export function disposeActionTimers(state: MutableState): void {
  const timers = pulseTimers.get(state);
  if (timers) for (const timer of timers.values()) window.clearTimeout(timer);
  pulseTimers.delete(state);
}

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
    case "pulse": {
      let timers = pulseTimers.get(state);
      if (!timers) {
        timers = new Map();
        pulseTimers.set(state, timers);
      }
      const previous = timers.get(action);
      if (previous !== undefined) window.clearTimeout(previous);
      Object.assign(state, resolveTemplate(action.values, variables));
      context.sendInput({ ...state });
      const timer = window.setTimeout(() => {
        timers.delete(action);
        if (!timers.size) pulseTimers.delete(state);
        Object.assign(state, resolveTemplate(action.releaseValues, variables));
        context.sendInput({ ...state });
      }, action.durationMs);
      timers.set(action, timer);
      break;
    }
  }
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
