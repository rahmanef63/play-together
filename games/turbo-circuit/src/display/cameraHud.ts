import type { ControllerMode } from "@play-together/contracts";
import * as THREE from "three";
import { trackById } from "../shared/catalog.js";
import { applyCameraJuice } from "./cameraJuice.js";
import { type CameraState, updateCameraView } from "./cameraViews.js";
import { updateCockpitHud } from "./cockpitHud.js";
import { updateGarageHud } from "./garagePresenter.js";
import type { TurboHud } from "./hud.js";
import { clamp } from "./math.js";
import type { Racer, RacerPose, TurboState } from "./model.js";

export type { CameraState } from "./cameraViews.js";
export function updateCameraAndHud(
  state: TurboState,
  me: Racer,
  pose: RacerPose,
  camera: THREE.PerspectiveCamera,
  cameraState: CameraState,
  dt: number,
  mode: ControllerMode,
  hud: TurboHud,
) {
  if (state.phase === "setup") setupCamera(camera, cameraState, dt);
  else {
    updateCameraView(me, pose, camera, cameraState, dt, mode);
    applyCameraJuice(me, camera, performance.now());
  }
  updateHud(state, me, hud);
}
function setupCamera(camera: THREE.PerspectiveCamera, state: CameraState, dt: number) {
  const desired = new THREE.Vector3(0, 88, 88),
    target = new THREE.Vector3(0, 0, 0),
    alpha = state.ready ? 1 - Math.exp(-3 * dt) : 1;
  camera.fov = THREE.MathUtils.lerp(camera.fov, 54, 1 - Math.exp(-4 * dt));
  camera.updateProjectionMatrix();
  camera.position.lerp(desired, alpha);
  state.target.lerp(target, state.ready ? 1 - Math.exp(-4 * dt) : 1);
  camera.lookAt(state.target);
  state.ready = true;
}
function updateHud(state: TurboState, me: Racer, hud: TurboHud) {
  const track = trackById(state.trackId),
    inSetup = state.phase === "setup";
  hud.host.dataset.phase = state.phase;
  hud.host.dataset.track = state.trackId;
  hud.host.dataset.car = me.carId;
  hud.host.dataset.camera = me.rearView ? "rear" : me.cameraMode;
  hud.host.dataset.paused = state.paused ? "true" : "false";
  hud.setup.style.display = inSetup ? "grid" : "none";
  for (const element of [hud.speed, hud.nitro, hud.minimap, hud.cameraBadge, hud.top])
    element.style.opacity = inSetup ? "0" : "1";
  updateGarageHud(state, me, hud);
  hud.cameraBadge.textContent = me.rearView ? "REAR VIEW" : `${me.cameraMode.toUpperCase()} VIEW`;
  hud.pause.style.opacity = state.paused ? "1" : "0";
  hud.results.style.display = state.phase === "finished" ? "block" : "none";
  if (state.phase === "finished")
    hud.resultsBody.textContent = [...state.racers]
      .sort((a, b) => (a.finishMs ?? Infinity) - (b.finishMs ?? Infinity))
      .slice(0, 7)
      .map(
        (r, i) => `${i + 1}. ${r.name} · ${r.finishMs === null ? "DNF" : formatTime(r.finishMs)}`,
      )
      .join("\n");
  const kmh = Math.round(Math.max(0, me.speed) * 4.2);
  updateCockpitHud(hud.cockpit, {
    visible: !inSetup && me.cameraMode === "driver" && !me.rearView,
    steering: me.steering,
    speedKmh: kmh,
    rearView: me.rearView,
  });
  hud.speedValue.textContent = String(kmh);
  hud.speedNeedle.style.transform = `rotate(${-125 + clamp(kmh / 235, 0, 1) * 250}deg)`;
  const drift =
    me.driftTier === 2
      ? "DRIFT II"
      : me.driftTier === 1
        ? "DRIFT I"
        : me.drafting
          ? `DRAFT ${Math.round(clamp(me.draftTimer / 1.25, 0, 1) * 100)}%`
          : me.boostTimer > 0
            ? "BOOST"
            : "";
  hud.nitro.textContent = `${me.item ?? "NO ITEM"} · COIN ${me.coins}${drift ? ` · ${drift}` : ""}`;
  const cpCount = Math.max(1, state.track.checkpoints.length),
    order = [...state.racers].sort(
      (a, b) => b.lap * cpCount + b.nextCheckpoint - (a.lap * cpCount + a.nextCheckpoint),
    ),
    position = Math.max(1, order.findIndex((r) => r.id === me.id) + 1);
  hud.top.textContent =
    state.phase === "setup"
      ? track.name.toUpperCase()
      : state.phase === "countdown"
        ? `START ${Math.max(1, Math.ceil(state.countdownMs / 1000))}`
        : state.phase === "finished"
          ? `FINISH · P${position}`
          : `LAP ${Math.min(me.lap + 1, state.lapsToWin)}/${state.lapsToWin} · P${position}/${state.racers.length} · ${formatTime(state.raceMs)}`;
  hud.wrongWay.style.opacity = me.wrongWay ? "1" : "0";
  hud.host.dataset.wrongWay = String(me.wrongWay);
  hud.host.dataset.scraping = String(me.scraping);
  hud.host.dataset.drafting = String(me.drafting);
  hud.host.dataset.driftTier = String(me.driftTier);
  hud.host.dataset.invulnerable = String(me.invulnerableTimer > 0);
}
function formatTime(ms: number) {
  const total = Math.max(0, ms) / 1000,
    minutes = Math.floor(total / 60),
    seconds = total - minutes * 60;
  return `${minutes}:${seconds.toFixed(1).padStart(4, "0")}`;
}
