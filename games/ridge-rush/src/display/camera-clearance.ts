import { centerLine, clampProgress, courseHeading } from "../shared/course.js";
import { terrainHeight } from "../shared/terrain.js";

export interface CameraPlan {
  progress: number;
  x: number;
  y: number;
}
export function corridorCamera(
  progress: number,
  lane: number,
  altitude: number,
  distance: number,
  rear: boolean,
  clearance: number,
): CameraPlan {
  const direction = rear ? 1 : -1;
  const p = clampProgress(progress + distance * direction);
  const heading = courseHeading(p);
  const x = centerLine(p) + lane * 0.35 + Math.sin(heading) * 0.4;
  return { progress: p, x, y: Math.max(altitude + clearance, terrainHeight(p, x) + clearance) };
}
