export const ELEVATION_PROFILE = [
  [0, 1040],
  [120, 960],
  [300, 830],
  [420, 730],
  [700, 610],
  [900, 570],
  [1120, 480],
  [1420, 430],
  [1600, 400],
  [1850, 280],
  [2050, 250],
  [2250, 300],
  [2520, 200],
  [2750, 160],
  [2950, 130],
  [3200, 90],
  [3410, 70],
  [3550, 60],
  [3600, 56],
] as const;

export type Surface = "dirt" | "rock" | "snow" | "mud";

export function profileElevation(progress: number): number {
  const p = Math.max(0, Math.min(3600, progress));
  for (let index = 1; index < ELEVATION_PROFILE.length; index += 1) {
    const previous = ELEVATION_PROFILE[index - 1]!;
    const next = ELEVATION_PROFILE[index]!;
    if (p > next[0]) continue;
    const t = smooth((p - previous[0]) / (next[0] - previous[0]));
    const base = previous[1] + (next[1] - previous[1]) * t;
    return base + microTerrain(p);
  }
  return ELEVATION_PROFILE.at(-1)![1] + microTerrain(p);
}

export function surfaceAt(progress: number): Surface {
  if (progress < 520) return "snow";
  if ((progress >= 920 && progress < 1290) || (progress >= 1740 && progress < 2050)) return "rock";
  if (progress >= 2470 && progress < 2780) return "mud";
  return "dirt";
}

export function surfaceGrip(surface: Surface): number {
  return surface === "rock" ? 0.94 : surface === "dirt" ? 0.88 : surface === "mud" ? 0.68 : 0.62;
}

export function surfaceRolling(surface: Surface): number {
  return surface === "mud" ? 1.65 : surface === "snow" ? 1.22 : surface === "rock" ? 1.05 : 0.78;
}

export function cliffSide(progress: number): -1 | 0 | 1 {
  if (
    (progress >= 360 && progress < 820) ||
    (progress >= 1700 && progress < 2070) ||
    (progress >= 2960 && progress < 3370)
  )
    return -1;
  if ((progress >= 980 && progress < 1370) || (progress >= 2260 && progress < 2660)) return 1;
  return 0;
}

export function crossSlope(progress: number): number {
  const side = cliffSide(progress);
  if (!side) return Math.sin(progress * 0.013) * 0.04;
  return side * (0.12 + 0.13 * (0.5 + 0.5 * Math.sin(progress * 0.027)));
}

function microTerrain(p: number): number {
  return Math.sin(p * 0.031) * 1.25 + Math.sin(p * 0.071 + 0.8) * 0.42;
}

function smooth(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}
