import { CARS, carById, clamp, TRACKS, trackById } from "../shared/catalog.js";
import type { TurboHud } from "./hud.js";
import type { Racer, TurboState } from "./model.js";
export function updateGarageHud(state: TurboState, me: Racer, hud: TurboHud) {
  const car = carById(me.carId),
    track = trackById(state.trackId),
    humans = state.racers.filter((r) => !r.bot),
    bots = state.racers.filter((r) => r.bot),
    ready = humans.filter((r) => r.ready).length;
  const trackIndex = Math.max(
      0,
      TRACKS.findIndex((item) => item.id === track.id),
    ),
    carIndex = Math.max(
      0,
      CARS.findIndex((item) => item.id === car.id),
    );
  hud.setupCircuit.textContent = `${trackIndex + 1}/${TRACKS.length} · ${track.name}`;
  hud.setupCircuitMeta.textContent = `↑↓ SELECT · ${track.lengthKm.toFixed(2)} KM · ${track.corners} TURNS · ${track.difficulty.toUpperCase()}`;
  hud.setupCar.textContent = `${carIndex + 1}/${CARS.length} · ${car.name}`;
  hud.setup.style.setProperty("--car-color", colorHex(car.color));
  hud.setupTrait.textContent = `←→ SELECT · ${car.trait.toUpperCase()} · TOP ${Math.round(car.topSpeed * 4.2)} KM/H`;
  hud.setupStats.textContent = [
    `ACC   ${stat(car.accel, 19, 29)}`,
    `GRIP  ${stat(car.handling, 0.82, 1.18)}`,
    `BOOST ${stat(car.boostPower, 13, 19)}`,
  ].join("\n");
  hud.setupMode.textContent = `${humans.length <= 2 ? "COUPLE KART" : "MULTI KART"} · ${bots.length} CPU · MANUAL THROTTLE`;
  hud.setupReady.textContent = me.ready
    ? `${me.name} READY · ${ready}/${humans.length} READY`
    : `${me.name} SELECTING · ${ready}/${humans.length} READY`;
  hud.setupRoster.textContent = humans
    .map((r, i) => `P${i + 1} ${r.ready ? "READY" : "PICKING"}`)
    .join("  /  ");
  hud.setupCta.textContent = me.ready ? "READY ✓" : "START · READY UP";
  hud.setupCta.dataset.ready = me.ready ? "true" : "false";
  hud.setupHelp.textContent =
    humans[0]?.id === me.id
      ? "STICK ← → CAR · STICK ↑ ↓ TRACK · R2 GAS · L2 BRAKE · B DRIFT · A/R1 ITEM · X VIEW · Y RESET · L1 REAR"
      : "STICK ← → CAR · P1 SELECTS TRACK · R2 GAS · L2 BRAKE · B DRIFT · A/R1 ITEM · X VIEW · Y RESET · L1 REAR";
}
function stat(value: number, min: number, max: number) {
  const score = Math.round(1 + clamp((value - min) / Math.max(0.001, max - min), 0, 1) * 4);
  return "■".repeat(score) + "□".repeat(5 - score);
}
function colorHex(value: number) {
  return `#${value.toString(16).padStart(6, "0")}`;
}
