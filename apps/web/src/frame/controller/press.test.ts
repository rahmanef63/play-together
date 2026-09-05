import { describe, expect, it, vi } from "vitest";
import { createPressLatch } from "./press";

describe("multi-source button ownership", () => {
  it("does not release a keyboard press when a touch finger leaves", () => {
    const change = vi.fn(),
      latch = createPressLatch(change);
    latch.set("keyboard", true);
    latch.set("pointer:1", true);
    latch.set("pointer:1", false);
    expect(change.mock.calls).toEqual([[true]]);
    latch.set("keyboard", false);
    expect(change.mock.calls).toEqual([[true], [false]]);
  });
  it("tracks multiple fingers and ignores unrelated pointer releases", () => {
    const change = vi.fn(),
      latch = createPressLatch(change);
    latch.set("pointer:1", true);
    latch.set("pointer:2", true);
    latch.set("pointer:9", false);
    latch.set("pointer:1", false);
    expect(change.mock.calls).toEqual([[true]]);
    latch.set("pointer:2", false);
    expect(change.mock.calls).toEqual([[true], [false]]);
  });
  it("clears all input devices exactly once on disposal", () => {
    const change = vi.fn(),
      latch = createPressLatch(change);
    latch.set("gamepad", true);
    latch.set("keyboard", true);
    latch.reset();
    latch.reset();
    expect(change.mock.calls).toEqual([[true], [false]]);
  });
});
