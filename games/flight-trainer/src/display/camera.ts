import * as THREE from "three";
import type { AircraftPose, FlightState } from "./model.js";
import { smoothing } from "./model.js";
import type { FlightScene } from "./scene.js";

export function updateFlightCameraAndHud(
  view: FlightScene,
  state: FlightState,
  me: FlightState["aircraft"][number],
  pose: AircraftPose,
  target: THREE.Vector3,
  up: THREE.Vector3,
  ready: boolean,
  dt: number,
  mode: "remote" | "handheld",
): boolean {
  const facing = {
    x: Math.sin(pose.heading) * Math.cos(pose.pitch),
    y: Math.sin(pose.pitch),
    z: Math.cos(pose.heading) * Math.cos(pose.pitch),
  };
  const right = { x: -Math.cos(pose.heading), y: 0, z: Math.sin(pose.heading) };
  const desiredCamera =
    mode === "handheld"
      ? new THREE.Vector3(pose.x, pose.y + 1.05, pose.z)
      : new THREE.Vector3(
          pose.x - facing.x * 18,
          pose.y + 7 - facing.y * 4,
          pose.z - facing.z * 18,
        );
  const desiredTarget =
    mode === "handheld"
      ? new THREE.Vector3(
          pose.x + facing.x * 45,
          pose.y + 1 + facing.y * 45,
          pose.z + facing.z * 45,
        )
      : new THREE.Vector3(pose.x + facing.x * 10, pose.y + facing.y * 8, pose.z + facing.z * 10);
  const desiredUp =
    mode === "handheld"
      ? new THREE.Vector3(
          right.x * Math.sin(pose.roll),
          Math.cos(pose.roll),
          right.z * Math.sin(pose.roll),
        )
      : new THREE.Vector3(0, 1, 0);

  if (!ready) {
    view.camera.position.copy(desiredCamera);
    target.copy(desiredTarget);
    up.copy(desiredUp);
    ready = true;
  } else {
    view.camera.position.lerp(desiredCamera, smoothing(mode === "handheld" ? 11 : 8, dt));
    target.lerp(desiredTarget, smoothing(12, dt));
    up.lerp(desiredUp, smoothing(10, dt)).normalize();
  }
  view.camera.up.copy(up);
  view.camera.lookAt(target);

  const checkpoint = state.checkpoints[me.nextCheckpoint];
  view.top.textContent = me.crashed
    ? "AIRCRAFT DOWN · RESTART FROM CONTROLLER"
    : me.missionComplete
      ? `MISSION COMPLETE · SCORE ${me.score}`
      : `FLIGHT TRAINER · NEXT ${checkpoint?.label ?? "LAND"} · SCORE ${me.score}`;
  view.horizonLine.style.transform = `translateY(${Math.round(pose.pitch * 85)}px) rotate(${Math.round(pose.roll * 57.3)}deg)`;
  const heading = `HDG ${String(Math.round(((me.heading * 180) / Math.PI + 360) % 360)).padStart(3, "0")}`;
  view.bottom.innerHTML = `<strong>${Math.round(me.airspeed * 1.94)} kt<br><small>AIRSPEED</small></strong><strong style="text-align:center;color:${me.stall ? "#ff6b6b" : "white"}">${me.stall ? "STALL" : heading}<br><small>${me.gearDown ? "GEAR DOWN" : "GEAR UP"} · ${me.flaps ? "FLAPS" : "CLEAN"}</small></strong><strong style="text-align:right">${Math.round(me.y)} m<br><small>ALT · VSI ${me.verticalSpeed.toFixed(1)}</small></strong>`;
  return ready;
}
