export const smoothing = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
export const smoothAngle = (current: number, target: number, alpha: number) =>
  current + Math.atan2(Math.sin(target - current), Math.cos(target - current)) * alpha;
export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
