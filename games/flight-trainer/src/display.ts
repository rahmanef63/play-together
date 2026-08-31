import type { DisplayGameModule } from "@play-together/game-sdk";
import * as THREE from "three";
import { updateFlightCameraAndHud } from "./display/camera.js";
import {
  type AircraftPose,
  type FlightState,
  isFlightState,
  smoothAngle,
  smoothing,
} from "./display/model.js";
import { createFlightScene, createPlaneMesh } from "./display/scene.js";

export const mountDisplay: DisplayGameModule["mountDisplay"] = (root, ctx) => {
  root.replaceChildren();
  const view = createFlightScene(root);
  const planes = new Map<string, THREE.Group>();
  const poses = new Map<string, AircraftPose>();
  let state: FlightState | null = null;
  const colors = [0xf97316, 0x38bdf8, 0xa78bfa, 0x22c55e];
  const unsubscribe = ctx.subscribe((message) => {
    if (!isFlightState(message.state)) return;
    state = message.state;
    for (const [index, aircraft] of state.aircraft.entries())
      if (!planes.has(aircraft.id)) {
        const mesh = createPlaneMesh(colors[index % colors.length] ?? 0xffffff);
        planes.set(aircraft.id, mesh);
        poses.set(aircraft.id, {
          x: aircraft.x,
          y: aircraft.y,
          z: aircraft.z,
          heading: aircraft.heading,
          pitch: aircraft.pitch,
          roll: aircraft.roll,
        });
        view.scene.add(mesh);
      }
    for (const [id, mesh] of planes)
      if (!state.aircraft.some((aircraft) => aircraft.id === id)) {
        view.scene.remove(mesh);
        planes.delete(id);
        poses.delete(id);
      }
    view.rings.forEach((ring, index) => {
      const active = state?.aircraft.some(
        (aircraft) => aircraft.nextCheckpoint === index && !aircraft.missionComplete,
      );
      (ring.material as THREE.MeshBasicMaterial).opacity = active ? 0.8 : 0.18;
    });
  });
  let raf = 0;
  let previousFrame = performance.now();
  const cameraTarget = new THREE.Vector3();
  const cameraUp = new THREE.Vector3(0, 1, 0);
  let cameraReady = false;
  let viewWidth = 0;
  let viewHeight = 0;
  const resize = () => {
    const width = Math.max(2, Math.round(view.host.clientWidth));
    const height = Math.max(2, Math.round(view.host.clientHeight));
    if (width === viewWidth && height === viewHeight) return;
    viewWidth = width;
    viewHeight = height;
    view.renderer.setSize(width, height, false);
    view.camera.aspect = width / height;
    view.camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(view.host);
  resize();
  const loop = (now = performance.now()) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, Math.max(0.001, (now - previousFrame) / 1000));
    previousFrame = now;
    if (state) {
      updateAircraft(state, planes, poses, dt);
      const me =
        state.aircraft.find((aircraft) => aircraft.id === ctx.playerId) ?? state.aircraft[0];
      const pose = me ? poses.get(me.id) : undefined;
      if (me && pose)
        cameraReady = updateFlightCameraAndHud(
          view,
          state,
          me,
          pose,
          cameraTarget,
          cameraUp,
          cameraReady,
          dt,
          ctx.mode,
        );
    }
    view.renderer.render(view.scene, view.camera);
  };
  loop();
  return () => {
    cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    unsubscribe();
    view.renderer.dispose();
    view.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose?.();
      const material = mesh.material;
      if (Array.isArray(material)) for (const item of material) item.dispose();
      else material?.dispose?.();
    });
    root.replaceChildren();
  };
};

function updateAircraft(
  state: FlightState,
  planes: Map<string, THREE.Group>,
  poses: Map<string, AircraftPose>,
  dt: number,
) {
  const alpha = smoothing(13, dt);
  for (const aircraft of state.aircraft) {
    const mesh = planes.get(aircraft.id);
    const pose = poses.get(aircraft.id);
    if (!mesh || !pose) continue;
    const teleported =
      Math.hypot(aircraft.x - pose.x, aircraft.y - pose.y, aircraft.z - pose.z) > 80;
    pose.x = teleported ? aircraft.x : THREE.MathUtils.lerp(pose.x, aircraft.x, alpha);
    pose.y = teleported ? aircraft.y : THREE.MathUtils.lerp(pose.y, aircraft.y, alpha);
    pose.z = teleported ? aircraft.z : THREE.MathUtils.lerp(pose.z, aircraft.z, alpha);
    pose.heading = teleported
      ? aircraft.heading
      : smoothAngle(pose.heading, aircraft.heading, alpha);
    pose.pitch = THREE.MathUtils.lerp(pose.pitch, aircraft.pitch, alpha);
    pose.roll = THREE.MathUtils.lerp(pose.roll, aircraft.roll, alpha);
    mesh.visible = !aircraft.crashed;
    mesh.position.set(pose.x, pose.y, pose.z);
    mesh.rotation.order = "YXZ";
    mesh.rotation.y = pose.heading;
    mesh.rotation.x = -pose.pitch;
    mesh.rotation.z = -pose.roll;
  }
}
