import * as THREE from "three";
import { flightCoach } from "./coach.js";
import type { AircraftPose, FlightState } from "./model.js";
import { smoothing } from "./model.js";
import { flightNavigation } from "./navigation.js";
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
  const chase = mode === "handheld" ? 17 : 20;
  const desiredCamera = new THREE.Vector3(
    pose.x - facing.x * chase + right.x * pose.roll * 0.9,
    pose.y + (mode === "handheld" ? 6.2 : 7.5) - facing.y * (mode === "handheld" ? 3.2 : 4),
    pose.z - facing.z * chase + right.z * pose.roll * 0.9,
  );
  const lookAhead = mode === "handheld" ? 14 : 10;
  const desiredTarget = new THREE.Vector3(
    pose.x + facing.x * lookAhead,
    pose.y + 0.7 + facing.y * lookAhead * 0.75,
    pose.z + facing.z * lookAhead,
  );
  const bank = mode === "handheld" ? pose.roll * 0.4 : 0;
  const desiredUp = new THREE.Vector3(
    right.x * Math.sin(bank),
    Math.cos(bank),
    right.z * Math.sin(bank),
  );

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
  view.camera.fov = THREE.MathUtils.lerp(
    view.camera.fov,
    (mode === "handheld" ? 60 : 62) + Math.min(7, me.airspeed * 0.06),
    smoothing(3, dt),
  );
  view.camera.updateProjectionMatrix();
  view.camera.up.copy(up);
  view.camera.lookAt(target);

  view.top.textContent = me.crashed
    ? "AIRCRAFT DOWN · RESTART FROM CONTROLLER"
    : me.missionComplete
      ? `MISSION COMPLETE · SCORE ${me.score}`
      : `SCORE ${me.score} · ${flightCoach(me, state)}`;
  view.navigation.textContent = flightNavigation(me, state);
  view.horizonLine.style.transform = `translateY(${Math.round(pose.pitch * 85)}px) rotate(${Math.round(pose.roll * 57.3)}deg)`;
  const heading = `HDG ${String(Math.round(((me.heading * 180) / Math.PI + 360) % 360)).padStart(3, "0")}`;
  const instruments = `<strong>${Math.round(me.airspeed * 1.94)} kt<br><small>AIRSPEED</small></strong><strong style="text-align:center;color:${me.stall ? "#ff6b6b" : "white"}">${me.stall ? "STALL" : heading}<br><small>${me.gearDown ? "GEAR DOWN" : "GEAR UP"} · ${me.flaps ? "FLAPS" : "CLEAN"}</small></strong><strong style="text-align:right">${Math.round(me.y)} m<br><small>ALT · VSI ${me.verticalSpeed.toFixed(1)}</small></strong>`;
  if (view.bottom.dataset.reading !== instruments) {
    view.bottom.innerHTML = instruments;
    view.bottom.dataset.reading = instruments;
  }
  return ready;
}
