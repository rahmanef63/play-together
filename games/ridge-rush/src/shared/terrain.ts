import {
  centerLine,
  cliffSide,
  courseCrossSlope,
  courseElevation,
  courseSurface,
  trailHalfWidth,
} from "./course.js";

export function terrainHeight(progress: number, worldX: number): number {
  const center = centerLine(progress);
  const lateral = worldX - center;
  const width = trailHalfWidth(progress, 0);
  const edge = Math.max(0, Math.abs(lateral) - width);
  const side = cliffSide(progress);
  const camber = lateral * courseCrossSlope(progress);
  if (side && Math.sign(lateral || side) === side) {
    const drop = Math.min(145, edge * 2.3 + edge * edge * 0.018);
    return courseElevation(progress) + camber - drop + rockNoise(progress, lateral);
  }
  const wall = edge * (side ? 0.85 : 0.34) + Math.min(52, edge * edge * 0.006);
  return courseElevation(progress) + camber + wall + rockNoise(progress, lateral);
}

export function terrainColor(progress: number): number {
  const surface = courseSurface(progress);
  if (surface === "snow") return 0xc8d2d2;
  if (surface === "rock") return 0x625d59;
  if (surface === "mud") return 0x4c4432;
  return 0x47673c;
}

function rockNoise(progress: number, lateral: number): number {
  const magnitude = Math.min(5, Math.abs(lateral) * 0.05);
  return (
    (Math.sin(progress * 0.047 + lateral * 0.21) + Math.sin(progress * 0.019 - lateral * 0.13)) *
    magnitude
  );
}
