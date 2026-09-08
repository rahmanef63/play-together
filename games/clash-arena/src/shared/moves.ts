export type MoveName = "jab" | "sweep" | "kick" | "launcher" | "throw" | "special";
export const SURGE_COST = 25;
export const LANE_REACH = 0.8;
export const moveData: Record<
  MoveName,
  {
    start: number;
    end: number;
    range: number;
    damage: number;
    stun: number;
    high: boolean;
    launch?: boolean;
  }
> = {
  jab: { start: 5, end: 16, range: 1.2, damage: 7, stun: 13, high: true },
  kick: { start: 7, end: 21, range: 1.45, damage: 10, stun: 16, high: true },
  sweep: { start: 8, end: 23, range: 1.3, damage: 9, stun: 18, high: false },
  launcher: { start: 11, end: 28, range: 1.35, damage: 12, stun: 22, high: true, launch: true },
  throw: { start: 5, end: 17, range: 0.85, damage: 15, stun: 25, high: true },
  special: { start: 9, end: 30, range: 1.7, damage: 16, stun: 24, high: true },
};
