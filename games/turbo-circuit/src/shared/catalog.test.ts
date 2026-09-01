import { describe, expect, it } from "vitest";
import { CIRCUITS, sampleCircuit } from "./catalog.js";

describe("real circuit catalog", () => {
  it("keeps verified real-world identity metadata", () => {
    expect(CIRCUITS.map(({ id, lengthKm, corners }) => ({ id, lengthKm, corners }))).toEqual([
      { id: "sepang", lengthKm: 5.543, corners: 15 },
      { id: "monza", lengthKm: 5.793, corners: 11 },
      { id: "interlagos", lengthKm: 4.309, corners: 15 },
    ]);
  });

  it.each(CIRCUITS)("keeps $id as one non-self-intersecting race loop", (circuit) => {
    const points = sampleCircuit(circuit, 240);
    const crossings: Array<[number, number]> = [];
    for (let first = 0; first < points.length; first += 1) {
      const a = points[first];
      const b = points[(first + 1) % points.length];
      if (!a || !b) continue;
      for (let second = first + 2; second < points.length; second += 1) {
        if ((second + 1) % points.length === first) continue;
        const c = points[second];
        const d = points[(second + 1) % points.length];
        if (c && d && segmentsCross(a, b, c, d)) crossings.push([first, second]);
      }
    }
    expect(crossings).toEqual([]);
  });
});

function segmentsCross(
  a: { x: number; z: number },
  b: { x: number; z: number },
  c: { x: number; z: number },
  d: { x: number; z: number },
) {
  const abC = orient(a, b, c);
  const abD = orient(a, b, d);
  const cdA = orient(c, d, a);
  const cdB = orient(c, d, b);
  return abC * abD < 0 && cdA * cdB < 0;
}

function orient(
  a: { x: number; z: number },
  b: { x: number; z: number },
  c: { x: number; z: number },
) {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}
