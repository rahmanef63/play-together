import type { ConsoleAction } from "@play-together/contracts";
import type { BrowserGameContext } from "@play-together/game-sdk";
import { runAction } from "./actions";
import type { MutableState } from "./types";

const heldByState = new WeakMap<MutableState, Map<object, Record<string, unknown>>>();
/** Releasing an opposing/aliased control restores the action still held. */
export function runHeldAction(
  owner: object,
  pressed: boolean,
  press: ConsoleAction,
  release: ConsoleAction | undefined,
  state: MutableState,
  context: BrowserGameContext,
): void {
  if (press.type !== "patch" || release?.type !== "patch") {
    const action = pressed ? press : release;
    if (action) runAction(action, state, context);
    return;
  }
  let held = heldByState.get(state);
  if (!held) {
    held = new Map();
    heldByState.set(state, held);
  }
  if (pressed) held.set(owner, press.values);
  else held.delete(owner);
  Object.assign(state, pressed ? press.values : release.values);
  for (const values of held.values()) Object.assign(state, values);
  context.sendInput({ ...state });
}
