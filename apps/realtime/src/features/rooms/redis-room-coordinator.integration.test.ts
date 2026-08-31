import { afterEach, describe, expect, it, vi } from "vitest";
import { RedisRoomCoordinator } from "./redis-room-coordinator.js";
import type { CoordinatedPresencePlayer } from "./room-coordinator.js";

const redisUrl = process.env.REDIS_TEST_URL;
const describeRedis = redisUrl ? describe : describe.skip;

describeRedis("RedisRoomCoordinator integration", () => {
  const coordinators: RedisRoomCoordinator[] = [];

  afterEach(async () => {
    await Promise.all(coordinators.splice(0).map((coordinator) => coordinator.close()));
  });

  it("shares presence, input, and snapshots across independent coordinator instances", async () => {
    if (!redisUrl) throw new Error("REDIS_TEST_URL is required");
    const left = new RedisRoomCoordinator(redisUrl);
    const right = new RedisRoomCoordinator(redisUrl);
    coordinators.push(left, right);

    const leftPresence = vi.fn();
    const rightPresence = vi.fn();
    const leftInput = vi.fn();
    const rightInput = vi.fn();
    const leftSnapshot = vi.fn();
    const rightSnapshot = vi.fn();
    const roomKey = `redis-integration-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const leftHandle = await left.attach(roomKey, {
      onPresence: leftPresence,
      onInput: leftInput,
      onSnapshot: leftSnapshot,
    });
    const rightHandle = await right.attach(roomKey, {
      onPresence: rightPresence,
      onInput: rightInput,
      onSnapshot: rightSnapshot,
    });
    await leftHandle.start();
    await rightHandle.start();

    await leftHandle.register({
      connectionId: "display-connection",
      playerId: "host",
      role: "display",
      mode: "remote",
      connectedAt: 10,
    });
    await rightHandle.register({
      connectionId: "controller-connection",
      playerId: "guest",
      role: "controller",
      mode: "remote",
      connectedAt: 20,
    });

    await expect
      .poll(() => {
        const players = leftPresence.mock.calls.at(-1)?.[0] as
          | CoordinatedPresencePlayer[]
          | undefined;
        return players?.length ?? 0;
      })
      .toBe(2);
    await expect
      .poll(() => {
        const players = rightPresence.mock.calls.at(-1)?.[0] as
          | CoordinatedPresencePlayer[]
          | undefined;
        return players?.length ?? 0;
      })
      .toBe(2);

    const input = {
      playerId: "guest",
      connectedAt: 20,
      payload: { steer: -0.75 },
      sequence: 1,
    };
    await rightHandle.publishInput(input);
    await expect.poll(() => leftInput.mock.calls.length).toBeGreaterThan(0);
    await expect.poll(() => rightInput.mock.calls.length).toBeGreaterThan(0);
    expect(leftInput).toHaveBeenLastCalledWith(input);
    expect(rightInput).toHaveBeenLastCalledWith(input);

    const snapshot = { tick: 42, serverTime: 1234, state: { x: 7 } };
    await leftHandle.publishSnapshot(snapshot);
    await expect.poll(() => leftSnapshot.mock.calls.length).toBeGreaterThan(0);
    await expect.poll(() => rightSnapshot.mock.calls.length).toBeGreaterThan(0);
    expect(leftSnapshot).toHaveBeenLastCalledWith(snapshot);
    expect(rightSnapshot).toHaveBeenLastCalledWith(snapshot);

    await rightHandle.unregister("controller-connection");
    await expect
      .poll(() => {
        const players = leftPresence.mock.calls.at(-1)?.[0] as
          | CoordinatedPresencePlayer[]
          | undefined;
        return players?.length ?? 0;
      })
      .toBe(1);

    await leftHandle.close();
    await rightHandle.close();
  });
});
