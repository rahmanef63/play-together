import { afterEach, describe, expect, it, vi } from "vitest";
import { mountFrameBootstrap } from "./frameBootstrap";

class FakeFrame {
  contentWindow = { postMessage: vi.fn() };
  loads = new Set<() => void>();
  reloads = 0;
  private value = "/game-frame.html";
  get src() {
    return this.value;
  }
  set src(value: string) {
    this.value = value;
    this.reloads += 1;
  }
  addEventListener(_type: "load", listener: () => void) {
    this.loads.add(listener);
  }
  removeEventListener(_type: "load", listener: () => void) {
    this.loads.delete(listener);
  }
  load() {
    for (const listener of this.loads) listener();
  }
}

const ticket = {
  playerId: "p1",
  gameId: "turbo-circuit",
  gameVersion: "0.11.0",
  manifestUrl: "/games/turbo-circuit/0.11.0/manifest.json",
  manifestSha256: "a".repeat(64),
};

afterEach(() => vi.useRealTimers());

describe("frame bootstrap recovery", () => {
  it("re-initializes on navigation and cancels the watchdog when ready", () => {
    vi.useFakeTimers();
    const frame = new FakeFrame();
    const onLoad = vi.fn();
    const onStall = vi.fn();
    const bootstrap = mountFrameBootstrap({
      frame,
      channel: "channel",
      role: "controller",
      mode: "handheld",
      ticket,
      onLoad,
      onStall,
    });
    frame.load();
    expect(frame.contentWindow.postMessage).toHaveBeenCalledOnce();
    expect(onLoad).toHaveBeenCalledOnce();
    bootstrap.ready();
    vi.advanceTimersByTime(20_000);
    expect(frame.reloads).toBe(0);
    expect(onStall).not.toHaveBeenCalled();
    bootstrap.dispose();
  });

  it("forces one reload when recovery navigation or remount stalls", () => {
    vi.useFakeTimers();
    const frame = new FakeFrame();
    const onStall = vi.fn();
    const bootstrap = mountFrameBootstrap({
      frame,
      channel: "channel",
      role: "controller",
      mode: "handheld",
      ticket,
      onLoad: vi.fn(),
      onStall,
    });
    bootstrap.recovering();
    vi.advanceTimersByTime(4_000);
    expect(frame.reloads).toBe(1);
    frame.load();
    vi.advanceTimersByTime(12_000);
    expect(frame.reloads).toBe(1);
    expect(onStall).toHaveBeenCalledWith("Game renderer did not become ready after recovery");
    bootstrap.dispose();
  });
});
