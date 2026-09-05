import type { ConsoleAction } from "@play-together/contracts";
import type { BrowserGameContext } from "@play-together/game-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { disposeActionTimers, runAction } from "./actions";

const pulse: ConsoleAction = {
  type: "pulse",
  values: { restart: true },
  releaseValues: { restart: false },
  durationMs: 80,
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("window", globalThis);
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("controller pulse lifecycle", () => {
  it("does not send stale input after the controller is disposed", () => {
    const sendInput = vi.fn(),
      state = { restart: false };
    runAction(pulse, state, { sendInput } as unknown as BrowserGameContext);
    disposeActionTimers(state);
    vi.advanceTimersByTime(100);
    expect(sendInput).toHaveBeenCalledTimes(1);
  });
  it("replaces a pending release when the same pulse is triggered again", () => {
    const sendInput = vi.fn(),
      state = { restart: false };
    const context = { sendInput } as unknown as BrowserGameContext;
    runAction(pulse, state, context);
    vi.advanceTimersByTime(40);
    runAction(pulse, state, context);
    vi.advanceTimersByTime(40);
    expect(state.restart).toBe(true);
    vi.advanceTimersByTime(40);
    expect(state.restart).toBe(false);
    expect(sendInput).toHaveBeenCalledTimes(3);
  });
  it("does not cancel another controller session's pulse", () => {
    const a = { restart: false },
      b = { restart: false };
    const context = { sendInput: vi.fn() } as unknown as BrowserGameContext;
    runAction(pulse, a, context);
    runAction(pulse, b, context);
    disposeActionTimers(a);
    vi.advanceTimersByTime(100);
    expect(b.restart).toBe(false);
  });
});
