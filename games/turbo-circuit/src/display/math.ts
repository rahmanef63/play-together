export const RX = 62;
export const RZ = 38;
export const TRACK_WIDTH = 16;
export const smoothing = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
export const smoothAngle = (current: number, target: number, alpha: number) =>
  current + Math.atan2(Math.sin(target - current), Math.cos(target - current)) * alpha;
export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
export const tangentHeading = (angle: number, rx = RX, rz = RZ) =>
  Math.atan2(-rx * Math.sin(angle), rz * Math.cos(angle));
