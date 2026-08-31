import type { ControllerMode } from "@play-together/contracts";
import * as THREE from "three";
import { carById, circuitById, nearestTrackPoint } from "../shared/catalog.js";
import type { TurboHud } from "./hud.js";
import { clamp, smoothing } from "./math.js";
import type { Racer, RacerPose, TurboState } from "./model.js";

export interface CameraState {
  target: THREE.Vector3;
  ready: boolean;
}

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
  if (state.phase === "setup") updateSetupCamera(state, camera, cameraState, dt);
  else if (me.cockpit) updateDriverCamera(me, pose, camera, cameraState, dt);
  else updateChaseCamera(me, pose, camera, cameraState, dt, mode);
  updateHud(state, me, pose, hud);
}

function updateSetupCamera(
  state: TurboState,
  camera: THREE.PerspectiveCamera,
  cameraState: CameraState,
  dt: number,
) {
  const circuit = circuitById(state.circuitId);
  const desired = new THREE.Vector3(0, 92, 92);
  const target = new THREE.Vector3(0, 0, 0);
  camera.fov = THREE.MathUtils.lerp(camera.fov, 54, smoothing(4, dt));
  camera.updateProjectionMatrix();
  camera.position.lerp(desired, cameraState.ready ? smoothing(3, dt) : 1);
  cameraState.target.lerp(target, cameraState.ready ? smoothing(4, dt) : 1);
  camera.lookAt(cameraState.target);
  cameraState.ready = true;
  camera.far = Math.max(500, circuit.width * 30);
}

function updateDriverCamera(
  me: Racer,
  pose: RacerPose,
  camera: THREE.PerspectiveCamera,
  cameraState: CameraState,
  dt: number,
) {
  const forwardX = Math.sin(pose.heading);
  const forwardZ = Math.cos(pose.heading);
  const desired = new THREE.Vector3(pose.x + forwardX * 0.75, 1.62, pose.z + forwardZ * 0.75);
  const target = new THREE.Vector3(pose.x + forwardX * 18, 1.35, pose.z + forwardZ * 18);
  camera.fov = THREE.MathUtils.lerp(
    camera.fov,
    71 + clamp(me.speed / 50, 0, 1) * 6,
    smoothing(6, dt),
  );
  camera.updateProjectionMatrix();
  camera.position.lerp(desired, cameraState.ready ? smoothing(16, dt) : 1);
  cameraState.target.lerp(target, cameraState.ready ? smoothing(18, dt) : 1);
  camera.lookAt(cameraState.target);
  cameraState.ready = true;
}

function updateChaseCamera(
  me: Racer,
  pose: RacerPose,
  camera: THREE.PerspectiveCamera,
  cameraState: CameraState,
  dt: number,
  mode: ControllerMode,
) {
  const speed = Math.abs(me.speed);
  const back = mode === "handheld" ? 11 + Math.min(6, speed * 0.09) : 17;
  const lookAhead = clamp(3.5 + speed * 0.14, 3.5, 10.5);
  const desired = new THREE.Vector3(
    pose.x - Math.sin(pose.heading) * back,
    mode === "handheld" ? 6 : 9.5,
    pose.z - Math.cos(pose.heading) * back,
  );
  const target = new THREE.Vector3(
    pose.x + Math.sin(pose.heading) * lookAhead,
    1.05,
    pose.z + Math.cos(pose.heading) * lookAhead,
  );
  camera.fov = THREE.MathUtils.lerp(camera.fov, 59 + clamp(speed / 50, 0, 1) * 8, smoothing(5, dt));
  camera.updateProjectionMatrix();
  camera.position.lerp(desired, cameraState.ready ? smoothing(mode === "handheld" ? 9 : 6, dt) : 1);
  cameraState.target.lerp(target, cameraState.ready ? smoothing(11, dt) : 1);
  camera.lookAt(cameraState.target);
  cameraState.ready = true;
}

function updateHud(state: TurboState, me: Racer, pose: RacerPose, hud: TurboHud) {
  const car = carById(me.carId);
  const circuit = circuitById(state.circuitId);
  hud.host.dataset.phase = state.phase;
  hud.host.dataset.circuit = state.circuitId;
  hud.host.dataset.car = me.carId;
  hud.host.dataset.camera = me.cockpit ? "driver" : "chase";
  hud.setup.style.display = state.phase === "setup" ? "block" : "none";
  hud.setupCircuit.textContent = `${circuit.name} · ${circuit.tagline}`;
  hud.setupCar.textContent = car.name;
  hud.setupTrait.textContent = `${car.trait} · ${Math.round(car.topSpeed * 4.2)} KM/H`;
  hud.setupStats.textContent = `ACC ${stat(car.accel, 22, 28)} · GRIP ${stat(car.handling, 0.88, 1.16)} · BRAKE ${stat(car.braking, 34, 41)}`;
  const humans = state.racers.filter((racer) => !racer.bot);
  const ready = humans.filter((racer) => racer.ready).length;
  hud.setupReady.textContent = me.ready
    ? `READY · ${ready}/${humans.length}`
    : `CHOOSE · ${ready}/${humans.length} READY`;
  hud.setupHelp.textContent =
    humans[0]?.id === me.id
      ? "STICK ↔ CAR · STICK ↑↓ CIRCUIT · GO READY"
      : "STICK ↔ CAR · P1 CHOOSES CIRCUIT · GO READY";
  hud.cameraBadge.textContent = me.cockpit ? "DRIVER VIEW" : "CHASE VIEW";
  hud.results.style.display = state.phase === "finished" ? "block" : "none";
  if (state.phase === "finished") {
    const result = [...state.racers]
      .sort(
        (a, b) =>
          (a.finishMs ?? Number.POSITIVE_INFINITY) - (b.finishMs ?? Number.POSITIVE_INFINITY),
      )
      .slice(0, 6)
      .map(
        (racer, index) =>
          `${index + 1}. ${racer.name} · ${racer.finishMs === null ? "DNF" : formatTime(racer.finishMs)}`,
      )
      .join("\n");
    hud.resultsBody.textContent = result;
  }

  const kmh = Math.round(Math.max(0, me.speed) * 4.2);
  hud.speedValue.textContent = String(kmh);
  hud.speedNeedle.style.transform = `rotate(${-125 + clamp(kmh / 235, 0, 1) * 250}deg)`;
  hud.nitro.textContent = `N₂O ${Math.round(me.nitro)}%`;
  const cpCount = Math.max(1, state.track.checkpoints.length);
  const order = [...state.racers].sort(
    (a, b) => b.lap * cpCount + b.nextCheckpoint - (a.lap * cpCount + a.nextCheckpoint),
  );
  const position = Math.max(1, order.findIndex((racer) => racer.id === me.id) + 1);
  hud.top.textContent =
    state.phase === "setup"
      ? circuit.name.toUpperCase()
      : state.phase === "countdown"
        ? `START ${Math.max(1, Math.ceil(state.countdownMs / 1000))}`
        : state.phase === "finished"
          ? `FINISH · P${position}`
          : `LAP ${Math.min(me.lap + 1, state.lapsToWin)}/${state.lapsToWin} · P${position}/${state.racers.length} · ${formatTime(state.raceMs)}`;
  const nearest = nearestTrackPoint(circuit, pose.x, pose.z);
  const alignment = Math.cos(pose.heading - nearest.heading);
  hud.wrongWay.style.opacity = me.speed > 7 && alignment < -0.25 ? "1" : "0";
}

function formatTime(ms: number) {
  const total = Math.max(0, ms) / 1000;
  const minutes = Math.floor(total / 60);
  const seconds = total - minutes * 60;
  return `${minutes}:${seconds.toFixed(1).padStart(4, "0")}`;
}
function stat(value: number, min: number, max: number) {
  const score = Math.round(1 + clamp((value - min) / Math.max(0.001, max - min), 0, 1) * 4);
  return "■".repeat(score) + "□".repeat(5 - score);
}
