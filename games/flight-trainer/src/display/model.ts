export interface Aircraft {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  heading: number;
  pitch: number;
  roll: number;
  airspeed: number;
  verticalSpeed: number;
  throttle: number;
  flaps: boolean;
  gearDown: boolean;
  stall: boolean;
  crashed: boolean;
  landed: boolean;
  missionComplete: boolean;
  nextCheckpoint: number;
  elapsedMs: number;
  score: number;
}
export interface FlightState {
  kind: "flight-trainer";
  runway: { x: number; zMin: number; zMax: number; width: number };
  checkpoints: Array<{ x: number; y: number; z: number; label: string }>;
  aircraft: Aircraft[];
}
export interface AircraftPose {
  x: number;
  y: number;
  z: number;
  heading: number;
  pitch: number;
  roll: number;
}
export const isFlightState = (value: unknown): value is FlightState =>
  typeof value === "object" && value !== null && (value as FlightState).kind === "flight-trainer";
export const smoothing = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
export const smoothAngle = (current: number, target: number, alpha: number) =>
  current + Math.atan2(Math.sin(target - current), Math.cos(target - current)) * alpha;
