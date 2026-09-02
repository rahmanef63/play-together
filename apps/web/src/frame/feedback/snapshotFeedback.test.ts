import type { SnapshotMessage } from "@play-together/contracts";
import { describe, expect, it, vi } from "vitest";
import { SnapshotFeedbackObserver } from "./snapshotFeedback";

const snapshot = (tick: number, state: unknown) =>
  ({ type: "snapshot", tick, state }) as SnapshotMessage;

describe("shared snapshot feedback", () => {
  it("emits impact and success from common player state without game-id branching", () => {
    const emit = vi.fn();
    const observer = new SnapshotFeedbackObserver("p1", emit);
    observer.observe(snapshot(1, { players: [{ id: "p1", score: 0, hits: 0 }] }));
    observer.observe(snapshot(2, { players: [{ id: "p1", score: 10, hits: 1 }] }));
    expect(emit).toHaveBeenCalledWith("impact");
    expect(emit).toHaveBeenCalledWith("success");
  });

  it("emits finish feedback for generic result phases", () => {
    const emit = vi.fn();
    const observer = new SnapshotFeedbackObserver("p1", emit);
    observer.observe(snapshot(1, { phase: "racing", racers: [{ id: "p1", score: 0 }] }));
    observer.observe(
      snapshot(2, { phase: "finished", winnerId: "p1", racers: [{ id: "p1", score: 0 }] }),
    );
    expect(emit).toHaveBeenCalledWith("finish");
    expect(emit).toHaveBeenCalledWith("success");
  });
});
