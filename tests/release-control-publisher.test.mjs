import { describe, expect, it } from "vitest";
import { ReleaseControlPublisher } from "../scripts/release-control-publisher.mjs";

const sha = "a".repeat(64);

class FakeRedis {
  status = "ready";
  blocked = new Set();
  published = [];
  async eval(_script, _keys, _blockedKey, channel, value, status, encodedEvent) {
    const changed =
      status === "blocked"
        ? this.blocked.has(value)
          ? 0
          : addBlocked(this.blocked, value)
        : this.blocked.delete(value)
          ? 1
          : 0;
    if (changed) this.published.push({ channel, value: JSON.parse(encodedEvent) });
    return changed;
  }
  async quit() {
    this.status = "end";
  }
}

function addBlocked(blocked, value) {
  blocked.add(value);
  return 1;
}

describe("ReleaseControlPublisher", () => {
  it("publishes only when the blocked mirror changes", async () => {
    const redis = new FakeRedis();
    const publisher = new ReleaseControlPublisher(redis);
    const release = { gameId: "pong", version: "0.4.0", manifestSha256: sha };

    expect(await publisher.apply({ ...release, status: "blocked" })).toBe(true);
    expect(await publisher.apply({ ...release, status: "blocked" })).toBe(false);
    expect(redis.published).toHaveLength(1);
    expect(redis.published[0].value).toMatchObject({ status: "blocked", gameId: "pong" });

    expect(await publisher.apply({ ...release, status: "retired" })).toBe(true);
    expect(redis.published).toHaveLength(2);
    expect(redis.published[1].value.status).toBe("retired");
  });
});
