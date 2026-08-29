import { describe, expect, it } from "vitest";
import {
  classifySocketPressure,
  SNAPSHOT_SOFT_BUFFER_LIMIT_BYTES,
  SOCKET_HARD_BUFFER_LIMIT_BYTES,
} from "./backpressure";

describe("room socket backpressure", () => {
  it("sends normally below the soft limit", () => {
    expect(classifySocketPressure(SNAPSHOT_SOFT_BUFFER_LIMIT_BYTES - 1)).toBe("send");
  });

  it("drops replaceable snapshots while a client catches up", () => {
    expect(classifySocketPressure(SNAPSHOT_SOFT_BUFFER_LIMIT_BYTES)).toBe("drop-snapshot");
    expect(classifySocketPressure(SOCKET_HARD_BUFFER_LIMIT_BYTES - 1)).toBe("drop-snapshot");
  });

  it("closes a connection whose outbound buffer is no longer bounded", () => {
    expect(classifySocketPressure(SOCKET_HARD_BUFFER_LIMIT_BYTES)).toBe("close");
    expect(classifySocketPressure(Number.NaN)).toBe("close");
  });
});
