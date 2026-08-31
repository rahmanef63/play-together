import type { DisplayGameModule } from "@play-together/game-sdk";
import * as THREE from "three";
import { addTrackEnvironment } from "./display/environment.js";
import { createTurboHud } from "./display/hud.js";
import { clamp, RX, RZ, smoothing, tangentHeading } from "./display/math.js";
import { isTurboState, type TurboState } from "./display/model.js";
import { createTrackScene } from "./display/track.js";
import { VehicleRenderer } from "./display/vehicleRenderer.js";

export const mountDisplay: DisplayGameModule["mountDisplay"] = (root, ctx) => {
  root.replaceChildren();
  const hud = createTurboHud(root);
  const { renderer, scene, camera } = createTrackScene(hud.canvas);
  addTrackEnvironment(scene);
  const vehicles = new VehicleRenderer(scene, hud.mapSvg, hud.mapDots, hud.host, ctx);
  let state: TurboState | null = null;
  const unsubscribe = ctx.subscribe((message) => {
    if (!isTurboState(message.state)) return;
    state = message.state;
    vehicles.sync(message.state.racers);
  });
  let raf = 0;
  let previousFrame = performance.now();
  const cameraTarget = new THREE.Vector3();
  let cameraReady = false;
  let viewWidth = 0;
  let viewHeight = 0;
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
      if (me && pose)
        updateCameraAndHud(
          state,
          me,
          pose,
          camera,
          cameraTarget,
          dt,
          ctx.mode,
          hud,
          () => cameraReady,
          (ready) => {
            cameraReady = ready;
          },
        );
    }
    renderer.render(scene, camera);
  };
  loop();
  return () => {
    cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    unsubscribe();
    renderer.dispose();
    vehicles.dispose();
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) for (const item of material) item.dispose();
      else material?.dispose?.();
    });
    root.replaceChildren();
  };
};

function updateCameraAndHud(
  state: TurboState,
  me: TurboState["racers"][number],
  pose: { x: number; z: number; heading: number },
  camera: THREE.PerspectiveCamera,
  cameraTarget: THREE.Vector3,
  dt: number,
  mode: "remote" | "handheld",
  hud: ReturnType<typeof createTurboHud>,
  getReady: () => boolean,
  setReady: (ready: boolean) => void,
) {
  const speed = Math.abs(me.speed);
  const back = mode === "handheld" ? 12 + Math.min(7, speed * 0.11) : 19;
  const lookAhead = clamp(3.5 + speed * 0.14, 3.5, 10.5);
  const desiredCamera = new THREE.Vector3(
    pose.x - Math.sin(pose.heading) * back,
    mode === "handheld" ? 6.1 : 10.5,
    pose.z - Math.cos(pose.heading) * back,
  );
  const desiredTarget = new THREE.Vector3(
    pose.x + Math.sin(pose.heading) * lookAhead,
    mode === "handheld" ? 1.1 : 1,
    pose.z + Math.cos(pose.heading) * lookAhead,
  );
  const targetFov = mode === "handheld" ? 59 + clamp(speed / 44, 0, 1) * 7 : 62;
  camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, smoothing(4.5, dt));
  camera.updateProjectionMatrix();
  if (!getReady()) {
    camera.position.copy(desiredCamera);
    cameraTarget.copy(desiredTarget);
    setReady(true);
  } else {
    camera.position.lerp(desiredCamera, smoothing(mode === "handheld" ? 9 : 6, dt));
    cameraTarget.lerp(desiredTarget, smoothing(11, dt));
  }
  camera.lookAt(cameraTarget);
  const angle = Math.atan2(pose.z / RZ, pose.x / RX);
  const alignment = Math.cos(pose.heading - tangentHeading(angle, RX, RZ));
  hud.wrongWay.style.opacity = speed > 6 && alignment < -0.22 ? "1" : "0";
  const order = [...state.racers].sort(
    (a, b) => b.lap * 4 + b.nextCheckpoint - (a.lap * 4 + a.nextCheckpoint),
  );
  const position = Math.max(1, order.findIndex((racer) => racer.id === me.id) + 1);
  hud.top.textContent =
    state.phase === "countdown"
      ? `STARTING IN ${Math.max(1, Math.ceil(state.countdownMs / 1000))}`
      : state.phase === "finished"
        ? "RACE COMPLETE"
        : `LAP ${Math.min(me.lap + 1, state.lapsToWin)}/${state.lapsToWin} · POSITION ${position}/${state.racers.length}`;
  hud.bottom.innerHTML = `<strong style="font-size:clamp(24px,7vw,52px)">${Math.round(Math.max(0, me.speed) * 4.2)}<small style="font-size:.35em"> km/h</small></strong><strong>N₂O ${Math.round(me.nitro)}%</strong>`;
}
