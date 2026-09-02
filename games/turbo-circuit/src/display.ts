import type { DisplayGameModule } from "@play-together/game-sdk";
import * as THREE from "three";
import { type CameraState, updateCameraAndHud } from "./display/cameraHud.js";
import { createTurboHud } from "./display/hud.js";
import { drawMinimapTrack } from "./display/minimap.js";
import { isTurboState, type TurboState } from "./display/model.js";
import { createTrackScene, createTrackWorld, disposeTrackWorld } from "./display/track.js";
import { VehicleRenderer } from "./display/vehicleRenderer.js";
import { WorldRenderer } from "./display/worldRenderer.js";
import { DEFAULT_TRACK } from "./shared/catalog.js";
export const mountDisplay: DisplayGameModule["mountDisplay"] = (root, ctx) => {
  root.replaceChildren();
  const hud = createTurboHud(root),
    { renderer, scene, camera } = createTrackScene(hud.canvas);
  let trackId = DEFAULT_TRACK.id,
    world = createTrackWorld(scene, renderer, trackId);
  drawMaps(hud.mapSvg, hud.setupMapSvg, trackId);
  const vehicles = new VehicleRenderer(scene, hud.mapSvg, hud.mapDots, hud.host, ctx),
    worldItems = new WorldRenderer(scene);
  let state: TurboState | null = null;
  const unsubscribe = ctx.subscribe((message) => {
    if (!isTurboState(message.state)) return;
    state = message.state;
    if (state.trackId !== trackId) {
      disposeTrackWorld(scene, world);
      trackId = state.trackId;
      world = createTrackWorld(scene, renderer, trackId);
      drawMaps(hud.mapSvg, hud.setupMapSvg, trackId);
      vehicles.resetMapDots();
    }
    vehicles.sync(state.racers);
  });
  let raf = 0,
    previous = performance.now(),
    viewWidth = 0,
    viewHeight = 0;
  const cameraState: CameraState = { target: new THREE.Vector3(), ready: false };
  const resize = () => {
    const width = Math.max(2, Math.round(hud.host.clientWidth)),
      height = Math.max(2, Math.round(hud.host.clientHeight));
    if (width === viewWidth && height === viewHeight) return;
    viewWidth = width;
    viewHeight = height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(hud.host);
  resize();
  const loop = (now = performance.now()) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, Math.max(0.001, (now - previous) / 1000));
    previous = now;
    if (state) {
      vehicles.update(state.racers, camera, dt);
      worldItems.sync(state.pickups, state.worldItems, dt);
      const humans = state.racers.filter((r) => !r.bot),
        me =
          state.racers.find((r) => r.id === ctx.playerId && !r.bot) ?? humans[0] ?? state.racers[0],
        pose = me ? vehicles.pose(me.id) : undefined;
      if (me && pose) {
        vehicles.setCockpit(
          me.id,
          state.phase !== "setup" && (me.cameraMode === "driver" || me.cameraMode === "bumper"),
        );
        updateCameraAndHud(state, me, pose, camera, cameraState, dt, ctx.mode, hud);
      }
    }
    renderer.render(scene, camera);
  };
  loop();
  return () => {
    cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    unsubscribe();
    vehicles.dispose();
    worldItems.dispose(scene);
    disposeTrackWorld(scene, world);
    renderer.dispose();
    root.replaceChildren();
  };
};
function drawMaps(race: SVGSVGElement, setup: SVGSVGElement, trackId: string) {
  drawMinimapTrack(race, trackId);
  drawMinimapTrack(setup, trackId);
}
