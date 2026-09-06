import type { DisplayGameModule } from "@play-together/game-sdk";
import * as THREE from "three";
import { createBike } from "./display/bike.js";
import { createPose, updateCamera, updateRiderMeshes } from "./display/camera.js";
import { RidgeEffects } from "./display/effects.js";
import { createHud, updateHud } from "./display/hud.js";
import { isRidgeState, type RiderPose, type RidgeViewState } from "./display/model.js";
import { createRidgeScene } from "./display/scene.js";

const RIDER_COLORS = [0xf97316, 0x38bdf8, 0xa78bfa, 0x22c55e];

export const mountDisplay: DisplayGameModule["mountDisplay"] = (root, context) => {
  root.replaceChildren();
  const hud = createHud(root);
  const view = createRidgeScene(hud.host);
  const effects = new RidgeEffects(view.scene);
  const bikes = new Map<string, THREE.Group>();
  const poses = new Map<string, RiderPose>();
  let state: RidgeViewState | null = null;
  let cameraReady = false;
  const cameraTarget = new THREE.Vector3();

  const unsubscribe = context.subscribe((message) => {
    if (!isRidgeState(message.state)) return;
    state = message.state;
    for (const rider of state.riders) {
      if (bikes.has(rider.id)) continue;
      const color = rider.bot
        ? 0xe5e7eb
        : (RIDER_COLORS[rider.slot % RIDER_COLORS.length] ?? 0xffffff);
      const mesh = createBike(color);
      bikes.set(rider.id, mesh);
      poses.set(rider.id, createPose(rider));
      view.scene.add(mesh);
    }
    for (const [id, mesh] of bikes) {
      if (state.riders.some((rider) => rider.id === id)) continue;
      view.scene.remove(mesh);
      disposeObject(mesh);
      bikes.delete(id);
      poses.delete(id);
    }
  });

  let width = 0;
  let height = 0;
  const resize = () => {
    const nextWidth = Math.max(2, Math.round(hud.host.clientWidth));
    const nextHeight = Math.max(2, Math.round(hud.host.clientHeight));
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    view.renderer.setSize(width, height, false);
    view.camera.aspect = width / height;
    view.camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(hud.host);
  resize();

  let raf = 0;
  let previous = performance.now();
  const loop = (now = performance.now()) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, Math.max(0.001, (now - previous) / 1000));
    previous = now;
    if (state) {
      updateRiderMeshes(state, bikes, poses, dt);
      effects.update(state, poses, dt);
      const me =
        state.riders.find((rider) => rider.id === context.playerId && !rider.bot) ??
        state.riders[0];
      cameraReady = updateCamera(
        view,
        state,
        context.playerId,
        context.mode,
        poses,
        cameraTarget,
        cameraReady,
        dt,
      );
      updateHud(hud, state, me);
    }
    view.renderer.render(view.scene, view.camera);
  };
  loop();

  return () => {
    cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    unsubscribe();
    view.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) disposeMesh(object);
    });
    effects.dispose();
    view.renderer.dispose();
    root.replaceChildren();
  };
};

function disposeObject(root: THREE.Group): void {
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) disposeMesh(object);
  });
}

function disposeMesh(mesh: THREE.Mesh): void {
  mesh.geometry?.dispose();
  const material = mesh.material;
  if (Array.isArray(material)) for (const item of material) item.dispose();
  else material?.dispose();
}
