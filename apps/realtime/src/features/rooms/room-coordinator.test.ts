import { describe, expect, it, vi } from "vitest";
import { InMemoryRoomCoordinator } from "./in-memory-room-coordinator.js";
import { authorityInstanceId, type CoordinatedPresencePlayer } from "./room-coordinator.js";

describe("distributed room coordinator", () => {
  it("elects display or handheld replicas before remote-only instances", () => {
    const players: CoordinatedPresencePlayer[] = [
      {
        connectionId: "remote-first",
        instanceId: "remote-instance",
        playerId: "remote",
        role: "controller",
        mode: "remote",
        connectedAt: 1,
      },
      {
        connectionId: "display-later",
        instanceId: "display-instance",
        playerId: "display",
        role: "display",
        mode: "remote",
        connectedAt: 2,
      },
    ];
    expect(authorityInstanceId(players)).toBe("display-instance");
  });

  it("fans presence, inputs, and authority snapshots across separate handles", async () => {
    const coordinator = new InMemoryRoomCoordinator();
    const presenceA = vi.fn();
    const presenceB = vi.fn();
    const inputA = vi.fn();
    const inputB = vi.fn();
    const snapshotA = vi.fn();
    const snapshotB = vi.fn();
    const a = await coordinator.attach("room-a", {
      onPresence: presenceA,
      onInput: inputA,
      onSnapshot: snapshotA,
    });
    const b = await coordinator.attach("room-a", {
      onPresence: presenceB,
      onInput: inputB,
      onSnapshot: snapshotB,
    });
    await a.start();
    await b.start();
    await a.register({
      connectionId: "display",
      playerId: "host",
      role: "display",
      mode: "remote",
      connectedAt: 10,
    });
    await b.register({
      connectionId: "remote",
      playerId: "guest",
      role: "controller",
      mode: "remote",
      connectedAt: 20,
    });

    const latestA = presenceA.mock.calls.at(-1)?.[0] as CoordinatedPresencePlayer[];
    const latestB = presenceB.mock.calls.at(-1)?.[0] as CoordinatedPresencePlayer[];
    expect(latestA).toHaveLength(2);
    expect(latestB).toHaveLength(2);
    expect(authorityInstanceId(latestA)).toBe(a.instanceId);

    const input = { playerId: "guest", connectedAt: 20, payload: { steer: -1 }, sequence: 1 };
    await b.publishInput(input);
    expect(inputA).toHaveBeenLastCalledWith(input);
    expect(inputB).toHaveBeenLastCalledWith(input);

    const snapshot = { tick: 12, serverTime: 1234, state: { x: 4 } };
    await a.publishSnapshot(snapshot);
    expect(snapshotA).toHaveBeenLastCalledWith(snapshot);
    expect(snapshotB).toHaveBeenLastCalledWith(snapshot);

    await b.unregister("remote");
    expect(presenceA.mock.calls.at(-1)?.[0] as CoordinatedPresencePlayer[]).toHaveLength(1);
    await a.close();
    await b.close();
    await coordinator.close();
  });
});
