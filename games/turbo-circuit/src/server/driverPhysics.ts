import { carById, circuitById, clamp, nearestTrackPoint } from "../shared/catalog.js";
import type { Racer, RaceState } from "./raceModel.js";

export function updateHumanDriver(racer: Racer, state: RaceState, dt: number) {
  const circuit = circuitById(state.circuitId);
  const car = carById(racer.carId);
  const input = racer.input;
  if (input.drive) racer.autoDrive = true;
  racer.cockpit = input.cockpit;
  const steerTarget = Math.abs(input.steer) < 0.08 ? 0 : input.steer;
  racer.steering += (steerTarget - racer.steering) * (1 - Math.exp(-9 * dt));
  const nearestBefore = nearestTrackPoint(circuit, racer.x, racer.z);
  const onTrack = nearestBefore.distance <= circuit.width * 0.62;
  const boosting = input.boost && racer.nitro > 1 && racer.speed > 2;
  const rollingDrag = onTrack ? 1.1 + racer.speed * 0.027 : 4.7 + racer.speed * 0.082;
  const driveAccel = racer.autoDrive ? car.accel : 0;
  const boostAccel = boosting ? car.nitroPower : 0;
  const accel = driveAccel + boostAccel - input.brake * car.braking - rollingDrag;
  racer.speed = clamp(racer.speed + accel * dt, 0, car.topSpeed + (boosting ? 9 : 0));
  if (!racer.autoDrive && input.brake < 0.02 && racer.speed < 0.3) racer.speed = 0;
  if (boosting) racer.nitro = Math.max(0, racer.nitro - 25 * dt);
  else racer.nitro = Math.min(100, racer.nitro + 7.5 * dt);

  const speedRatio = clamp(racer.speed / car.topSpeed, 0, 1);
  const steeringAuthority = car.handling * (1.14 - speedRatio * 0.36);
  const motionGrip = clamp(racer.speed / 6.5, 0, 1);
  racer.heading -= racer.steering * 2.08 * steeringAuthority * motionGrip * dt;
  racer.x += Math.sin(racer.heading) * racer.speed * dt;
  racer.z += Math.cos(racer.heading) * racer.speed * dt;

  const nearest = nearestTrackPoint(circuit, racer.x, racer.z);
  if (nearest.distance > circuit.width * 0.72) {
    const recovery = nearest.distance > circuit.width * 1.8 ? 2.2 : 0.9;
    racer.x += (nearest.x - racer.x) * recovery * dt;
    racer.z += (nearest.z - racer.z) * recovery * dt;
    racer.speed *= Math.max(0.55, 1 - (nearest.distance > circuit.width * 1.8 ? 1.5 : 0.65) * dt);
  }
}
