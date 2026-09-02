import { describe, expect, it } from "vitest";
import { CARS, TRACKS } from "./catalog.js";
import { featurePoses, nearestTrackPoint, sampleTrack } from "./trackMath.js";

describe("kart catalog", () => {
  it("ships three original Play Together kart tracks", () => {
    expect(TRACKS.map((track) => track.id)).toEqual(["neo-metro", "cosmic-loop", "sunset-dunes"]);
    expect(TRACKS.every((track) => track.laps === 3 && track.controlPoints.length >= 14)).toBe(
      true,
    );
  });
  it("samples closed racing lines with bounded feature positions", () => {
    for (const track of TRACKS) {
      const samples = sampleTrack(track, 180);
      expect(samples).toHaveLength(180);
      for (const p of featurePoses(track, track.features.itemBoxes, [-5, 0, 5]))
        expect(nearestTrackPoint(track, p.x, p.z).distance).toBeLessThan(track.width * 0.5);
    }
  });
  it("offers six brand-neutral kart builds", () => {
    expect(CARS).toHaveLength(6);
    expect(new Set(CARS.map((car) => car.id)).size).toBe(6);
    expect(CARS.every((car) => car.topSpeed > 35 && car.accel > 15 && car.handling > 0.7)).toBe(
      true,
    );
  });
});
