import type { SnapshotMessage } from "@play-together/contracts";
import { describe, expect, it } from "vitest";
import { summarizeConsoleTelemetry } from "./consoleTelemetry";

const snapshot = (state: unknown): SnapshotMessage => ({
  type: "snapshot",
  tick: 1,
  serverTime: 1,
  state,
});

describe("portrait remote telemetry", () => {
  it("summarizes a race with position, lap, speed, item and a minimap", () => {
    const summary = summarizeConsoleTelemetry(
      snapshot({
        kind: "turbo-circuit",
        phase: "racing",
        lapsToWin: 3,
        track: {
          name: "Harbor Loop",
          checkpoints: [
            { x: 0, z: 0 },
            { x: 100, z: 0 },
            { x: 100, z: 100 },
            { x: 0, z: 100 },
          ],
        },
        racers: [
          { id: "cpu", lap: 1, nextCheckpoint: 1, speed: 20, x: 90, z: 10 },
          {
            id: "me",
            lap: 1,
            nextCheckpoint: 2,
            speed: 32.4,
            coins: 6,
            item: "rocket",
            x: 98,
            z: 74,
          },
        ],
      }),
      "me",
    );

    expect(summary.phase).toBe("RACING");
    expect(summary.detail).toBe("Harbor Loop");
    expect(summary.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "POS", value: "1/2" }),
        expect.objectContaining({ label: "LAP", value: "2/3" }),
        expect.objectContaining({ label: "SPEED", value: "32" }),
        expect.objectContaining({ label: "COINS", value: "6" }),
        expect.objectContaining({ label: "ITEM", value: "ROCKET" }),
      ]),
    );
    expect(summary.map?.route).toHaveLength(4);
    expect(summary.map?.actors.find((actor) => actor.own)).toMatchObject({ x: 98, z: 74 });
  });

  it("shows useful flight instrumentation without game-specific UI code", () => {
    const summary = summarizeConsoleTelemetry(
      snapshot({
        kind: "flight-trainer",
        checkpoints: [{ x: 0, z: 0, label: "TAKEOFF" }],
        aircraft: [
          {
            id: "me",
            airspeed: 84.4,
            y: 42.2,
            verticalSpeed: 3.7,
            score: 250,
            throttle: 0.72,
            gearDown: false,
            flaps: true,
            nextCheckpoint: 0,
            x: 2,
            z: -10,
          },
        ],
      }),
      "me",
    );

    expect(summary.detail).toBe("TAKEOFF");
    expect(summary.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "AIRSPD", value: "84" }),
        expect.objectContaining({ label: "ALT", value: "42" }),
        expect.objectContaining({ label: "CLIMB", value: "+4" }),
        expect.objectContaining({ label: "THR", value: "72%" }),
        expect.objectContaining({ label: "GEAR", value: "UP" }),
      ]),
    );
  });

  it("prioritizes safety/combat status from the same generic snapshot adapter", () => {
    const stalled = summarizeConsoleTelemetry(
      snapshot({ kind: "flight-trainer", aircraft: [{ id: "me", stall: true }] }),
      "me",
    );
    expect(stalled.phase).toBe("STALL");

    const dogfight = summarizeConsoleTelemetry(
      snapshot({
        kind: "sky-strike",
        phase: "dogfight",
        round: 2,
        planes: [
          { id: "me", kills: 3, deaths: 1, hp: 70, speed: 45, x: 4, y: 38, z: 5 },
          { id: "enemy", kills: 1, deaths: 3, hp: 20, speed: 40, x: 20, y: 32, z: 15 },
        ],
      }),
      "me",
    );
    expect(dogfight.phase).toBe("DOGFIGHT");
    expect(dogfight.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "POS", value: "1/2" }),
        expect.objectContaining({ label: "HP", value: "70" }),
        expect.objectContaining({ label: "KILLS", value: "3" }),
        expect.objectContaining({ label: "ROUND", value: "2" }),
      ]),
    );
  });
});
