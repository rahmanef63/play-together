import { afterEach, describe, expect, it } from "vitest";
import { RedisReleaseControl } from "./redis-release-control.js";

const redisUrl = process.env.REDIS_TEST_URL;
const describeRedis = redisUrl ? describe : describe.skip;

describeRedis("RedisReleaseControl integration", () => {
  const controls: RedisReleaseControl[] = [];

  afterEach(async () => {
    await Promise.all(controls.splice(0).map((control) => control.close()));
  });

  it("becomes ready against the managed Redis command + subscriber paths", async () => {
    if (!redisUrl) throw new Error("REDIS_TEST_URL is required");
    const control = new RedisReleaseControl(redisUrl);
    controls.push(control);
    const events: unknown[] = [];
    await expect(control.start((event) => events.push(event))).resolves.toBeUndefined();
    expect(events).toEqual(expect.any(Array));
  });
});
