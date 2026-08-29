import { describe, expect, it } from "vitest";
import { TicketReplayGuard } from "./replay-guard";

describe("TicketReplayGuard", () => {
  it("accepts a ticket once and rejects replay", () => {
    const guard = new TicketReplayGuard();
    expect(guard.consume("ticket-1", 200, 100)).toBe(true);
    expect(guard.consume("ticket-1", 200, 101)).toBe(false);
  });

  it("purges expired ticket identifiers", () => {
    const guard = new TicketReplayGuard(2);
    expect(guard.consume("old", 101, 100)).toBe(true);
    expect(guard.consume("new", 300, 102)).toBe(true);
    expect(guard.consume("old", 300, 102)).toBe(true);
  });
});
