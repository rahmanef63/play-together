import type { DisplayGameModule } from "@play-together/game-sdk";
import * as THREE from "three";
import { type CameraState, updateCameraAndHud } from "./display/cameraHud.js";
import { createTurboHud } from "./display/hud.js";
import { drawMinimapTrack } from "./display/minimap.js";
import { isTurboState, type TurboState } from "./display/model.js";
import { createCircuitWorld, createTrackScene, disposeCircuitWorld } from "./display/track.js";
import { VehicleRenderer } from "./display/vehicleRenderer.js";
import { circuitById } from "./shared/catalog.js";

export const mountDisplay: DisplayGameModule["mountDisplay"] = (root, ctx) => {
  root.replaceChildren();
  const hud = createTurboHud(root);
  const { renderer, scene, camera } = createTrackScene(hud.canvas);
  let circuitId = circuitById("sepang").id;
  let world = createCircuitWorld(scene, renderer, circuitId);
  drawCircuitMaps(hud.mapSvg, hud.setupMapSvg, circuitId);
  const vehicles = new VehicleRenderer(scene, hud.mapSvg, hud.mapDots, hud.host, ctx);
  let state: TurboState | null = null;
  const unsubscribe = ctx.subscribe((message) => {
    if (!isTurboState(message.state)) return;
    state = message.state;
    if (state.circuitId !== circuitId) {
      disposeCircuitWorld(scene, world);
      circuitId = state.circuitId;
      world = createCircuitWorld(scene, renderer, circuitId);
      drawCircuitMaps(hud.mapSvg, hud.setupMapSvg, circuitId);
      vehicles.resetMapDots();
    }
    vehicles.sync(state.racers);
  });

  let raf = 0;
  let previousFrame = performance.now();
  let viewWidth = 0;
  let viewHeight = 0;
  const cameraState: CameraState = { target: new THREE.Vector3(), ready: false };
  const resize = () => {
    const width = Math.max(2, Math.round(hud.host.clientWidth));
    const height = Math.max(2, Math.round(hud.host.clientHeight));
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
    const dt = Math.min(0.05, Math.max(0.001, (now - previousFrame) / 1000));
    previousFrame = now;
    if (state) {
      vehicles.update(state.racers, camera, dt);
      const humans = state.racers.filter((racer) => !racer.bot);
      const me =
        state.racers.find((racer) => racer.id === ctx.playerId && !racer.bot) ??
        humans[0] ??
        state.racers[0];
      const pose = me ? vehicles.pose(me.id) : undefined;
      if (me && pose) {
        vehicles.setCockpit(me.id, state.phase !== "setup" && me.cockpit);
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
    disposeCircuitWorld(scene, world);
    renderer.dispose();
    root.replaceChildren();
  };
};

function drawCircuitMaps(raceMap: SVGSVGElement, setupMap: SVGSVGElement, circuitId: string) {
  drawMinimapTrack(raceMap, circuitId);
  drawMinimapTrack(setupMap, circuitId);
}
