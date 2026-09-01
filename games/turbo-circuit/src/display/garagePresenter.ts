import { CARS, CIRCUITS, carById, circuitById, clamp } from "../shared/catalog.js";
import type { TurboHud } from "./hud.js";
import type { Racer, TurboState } from "./model.js";

export function updateGarageHud(state: TurboState, me: Racer, hud: TurboHud) {
  const car = carById(me.carId);
  const circuit = circuitById(state.circuitId);
  const humans = state.racers.filter((racer) => !racer.bot);
  const bots = state.racers.filter((racer) => racer.bot);
  const ready = humans.filter((racer) => racer.ready).length;
  const circuitIndex = Math.max(
    0,
    CIRCUITS.findIndex((item) => item.id === circuit.id),
  );
  const carIndex = Math.max(
    0,
    CARS.findIndex((item) => item.id === car.id),
  );

  hud.setupCircuit.textContent = `${circuitIndex + 1}/${CIRCUITS.length} · ${circuit.name}`;
  hud.setupCircuitMeta.textContent = `↑↓ SELECT · ${circuit.laps} LAPS · ${circuit.tagline}`;
  hud.setupCar.textContent = `${carIndex + 1}/${CARS.length} · ${car.name}`;
  hud.setup.style.setProperty("--car-color", colorHex(car.color));
  hud.setupTrait.textContent = `←→ SELECT · ${car.trait.toUpperCase()} · TOP ${Math.round(car.topSpeed * 4.2)} KM/H`;
  hud.setupStats.textContent = [
    `ACC   ${stat(car.accel, 22, 28)}`,
    `GRIP  ${stat(car.handling, 0.88, 1.16)}`,
    `BRAKE ${stat(car.braking, 34, 41)}`,
  ].join("\n");

  const raceMode = humans.length <= 2 ? "COUPLE CIRCUIT" : `${humans.length}P CIRCUIT`;
  hud.setupMode.textContent = `${raceMode} · ${bots.length} CPU · AUTO-THROTTLE`;
  hud.setupReady.textContent = me.ready
    ? `${me.name} READY · ${ready}/${humans.length} READY`
    : `${me.name} SELECTING · ${ready}/${humans.length} READY`;
  hud.setupRoster.textContent = humans
    .map((racer, index) => `P${index + 1} ${racer.ready ? "READY" : "PICKING"}`)
    .join("  /  ");
  hud.setupCta.textContent = me.ready ? "READY ✓" : "GO · READY UP";
  hud.setupCta.dataset.ready = me.ready ? "true" : "false";
  hud.setupHelp.textContent =
    humans[0]?.id === me.id
      ? "STICK ← → CAR  ·  STICK ↑ ↓ CIRCUIT  ·  GO READY  ·  RACE AUTO-DRIVES  ·  BRAKE / BOOST / VIEW"
      : "STICK ← → CAR  ·  P1 SELECTS CIRCUIT  ·  GO READY  ·  RACE AUTO-DRIVES  ·  BRAKE / BOOST / VIEW";
}

function stat(value: number, min: number, max: number) {
  const score = Math.round(1 + clamp((value - min) / Math.max(0.001, max - min), 0, 1) * 4);
  return "■".repeat(score) + "□".repeat(5 - score);
}

function colorHex(value: number) {
  return `#${value.toString(16).padStart(6, "0")}`;
}
