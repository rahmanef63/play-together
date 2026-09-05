export interface InputState {
  pitch: number;
  roll: number;
  yaw: number;
  throttle: number;
  flaps: boolean;
  gear: boolean;
  restart: boolean;
  brake: boolean;
  level: boolean;
}
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
  airborne: boolean;
  landingScored: boolean;
  missionComplete: boolean;
  nextCheckpoint: number;
  elapsedMs: number;
  score: number;
  input: InputState;
}
export function createAircraft(id: string, name: string, lane = 0): Aircraft {
  return {
    id,
    name,
    x: (lane - 1.5) * 3,
    y: 1.2,
    z: -145 - lane * 6,
    heading: 0,
    pitch: 0,
    roll: 0,
    airspeed: 0,
    verticalSpeed: 0,
    throttle: 0,
    flaps: false,
    gearDown: true,
    stall: false,
    crashed: false,
    landed: false,
    airborne: false,
    landingScored: false,
    missionComplete: false,
    nextCheckpoint: 0,
    elapsedMs: 0,
    score: 0,
    input: {
      pitch: 0,
      roll: 0,
      yaw: 0,
      throttle: 0,
      flaps: false,
      gear: true,
      restart: false,
      brake: false,
      level: false,
    },
  };
}
