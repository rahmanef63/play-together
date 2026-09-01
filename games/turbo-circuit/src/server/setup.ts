import {
  CARS,
  CIRCUITS,
  circuitById,
  circuitCheckpoints,
  DEFAULT_CAR,
  DEFAULT_CIRCUIT,
  gridPose,
  wrapIndex,
} from "../shared/catalog.js";
import type { InputState, Racer, RaceState } from "./raceModel.js";

export function applySetupInput(state: RaceState, racer: Racer, patch: Partial<InputState>) {
  if (Math.abs(racer.input.steer) < 0.3) racer.menuXActive = false;
  if (Math.abs(racer.input.menuY) < 0.3) racer.menuYActive = false;
  if (Math.abs(racer.input.steer) > 0.52 && !racer.menuXActive) {
    racer.menuXActive = true;
    const index = CARS.findIndex((car) => car.id === racer.carId);
    racer.carId =
      CARS[wrapIndex(index + Math.sign(racer.input.steer), CARS.length)]?.id ?? DEFAULT_CAR.id;
    racer.ready = false;
  }
  const humans = state.racers.filter((item) => !item.bot);
  const leader = humans[0];
  if (leader?.id === racer.id && Math.abs(racer.input.menuY) > 0.52 && !racer.menuYActive) {
    racer.menuYActive = true;
    const index = CIRCUITS.findIndex((circuit) => circuit.id === state.circuitId);
    const next =
      CIRCUITS[wrapIndex(index + Math.sign(racer.input.menuY), CIRCUITS.length)] ?? DEFAULT_CIRCUIT;
    setCircuit(state, next.id);
    for (const human of humans) human.ready = false;
  }
  if (patch.drive === true) {
    racer.ready = true;
    racer.autoDrive = true;
  }
}

export function setCircuit(state: RaceState, circuitId: string) {
  const circuit = circuitById(circuitId);
  state.circuitId = circuit.id;
  state.lapsToWin = circuit.laps;
  state.track = {
    id: circuit.id,
    name: circuit.name,
    width: circuit.width,
    checkpoints: circuitCheckpoints(circuit),
  };
  resetGrid(state);
}

export function resetGrid(state: RaceState) {
  const circuit = circuitById(state.circuitId);
  const humans = state.racers.filter((item) => !item.bot);
  const bots = state.racers.filter((item) => item.bot);
  for (const [index, racer] of [...humans, ...bots].entries()) {
    Object.assign(racer, gridPose(circuit, index));
    racer.speed = 0;
    racer.lap = 0;
    racer.nextCheckpoint = 1;
    racer.nitro = 100;
    racer.finished = false;
    racer.finishMs = null;
    racer.steering = 0;
  }
}
