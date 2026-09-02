import { KART_TRACKS } from "./kartTracks.js";

export type TrackId = "neo-metro" | "cosmic-loop" | "sunset-dunes";
export type TrackTheme = "metro" | "cosmic" | "dunes";
export type CarId = "falcon-r" | "comet-gt" | "manta-rs" | "volta-x" | "aero-k" | "brick-8";
export interface TrackSpec {
  id: TrackId;
  name: string;
  shortName: string;
  location: string;
  tagline: string;
  theme: TrackTheme;
  difficulty: "easy" | "medium" | "hard";
  lengthKm: number;
  corners: number;
  width: number;
  laps: number;
  palette: { sky: number; ground: number; road: number; accent: number };
  controlPoints: Array<readonly [number, number]>;
  features: { boostPads: number[]; coinRows: number[]; itemBoxes: number[] };
}
export interface CarSpec {
  id: CarId;
  name: string;
  trait: string;
  color: number;
  topSpeed: number;
  accel: number;
  handling: number;
  braking: number;
  boostPower: number;
  weight: number;
}

export const TRACKS = KART_TRACKS;
export const DEFAULT_TRACK = required(TRACKS[0], "Default track missing");
export const DEFAULT_CAR: CarSpec = {
  id: "falcon-r",
  name: "Falcon R",
  trait: "Balanced",
  color: 0xe34245,
  topSpeed: 43,
  accel: 24,
  handling: 1,
  braking: 36,
  boostPower: 15,
  weight: 1,
};
export const CARS: CarSpec[] = [
  DEFAULT_CAR,
  {
    id: "comet-gt",
    name: "Comet GT",
    trait: "Top speed",
    color: 0x3578d4,
    topSpeed: 48,
    accel: 21,
    handling: 0.88,
    braking: 33,
    boostPower: 17,
    weight: 1.18,
  },
  {
    id: "manta-rs",
    name: "Manta RS",
    trait: "Grip",
    color: 0xe7b932,
    topSpeed: 41,
    accel: 27,
    handling: 1.18,
    braking: 40,
    boostPower: 13,
    weight: 0.9,
  },
  {
    id: "volta-x",
    name: "Volta X",
    trait: "Mini turbo",
    color: 0x8b5cf6,
    topSpeed: 42,
    accel: 26,
    handling: 1.08,
    braking: 37,
    boostPower: 19,
    weight: 0.86,
  },
  {
    id: "aero-k",
    name: "Aero K",
    trait: "Acceleration",
    color: 0x22c55e,
    topSpeed: 40,
    accel: 29,
    handling: 1.12,
    braking: 38,
    boostPower: 14,
    weight: 0.78,
  },
  {
    id: "brick-8",
    name: "Brick 8",
    trait: "Heavy",
    color: 0xf97316,
    topSpeed: 47,
    accel: 19,
    handling: 0.82,
    braking: 31,
    boostPower: 16,
    weight: 1.35,
  },
];
export const trackById = (id: string) => TRACKS.find((item) => item.id === id) ?? DEFAULT_TRACK;
export const carById = (id: string) => CARS.find((item) => item.id === id) ?? DEFAULT_CAR;
export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
export const wrapIndex = (value: number, length: number) => ((value % length) + length) % length;
function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}
