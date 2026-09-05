import type { BrowserGameContext } from "@play-together/game-sdk";
import { describe, expect, it, vi } from "vitest";
import { runHeldAction } from "./heldActions";

describe("simultaneous action patches", () => {
  it("restores a held rudder when the opposite shoulder is released", () => {
    const state = { yaw: 0 },
      sendInput = vi.fn(),
      context = { sendInput } as unknown as BrowserGameContext;
    const left = {},
      right = {};
    const neutral = { type: "patch", values: { yaw: 0 } } as const;
    const l = { type: "patch", values: { yaw: -1 } } as const,
      r = { type: "patch", values: { yaw: 1 } } as const;
    runHeldAction(left, true, l, neutral, state, context);
    runHeldAction(right, true, r, neutral, state, context);
    expect(state.yaw).toBe(1);
    runHeldAction(right, false, r, neutral, state, context);
    expect(state.yaw).toBe(-1);
    runHeldAction(left, false, l, neutral, state, context);
    expect(state.yaw).toBe(0);
  });
  it("does not retrigger one-shot item actions when another control changes", () => {
    const sendInput = vi.fn(),
      context = { sendInput } as unknown as BrowserGameContext;
    const action = { type: "send", payload: { action: "item" } } as const;
    runHeldAction({}, true, action, undefined, {}, context);
    runHeldAction({}, false, action, undefined, {}, context);
    expect(sendInput).toHaveBeenCalledTimes(1);
  });
  it("isolates different controller sessions", () => {
    const a = { yaw: 0 },
      b = { yaw: 0 },
      context = { sendInput: vi.fn() } as unknown as BrowserGameContext;
    const action = { type: "patch", values: { yaw: -1 } } as const,
      release = { type: "patch", values: { yaw: 0 } } as const;
    runHeldAction({}, true, action, release, a, context);
    expect(a.yaw).toBe(-1);
    expect(b.yaw).toBe(0);
  });
});
