import type { DisplayGameModule } from "@play-together/game-sdk";
import * as THREE from "three";
import { updateSkyCameraAndHud } from "./display/camera.js";
import {
  isSkyState,
  type PlanePose,
  type SkyState,
  smoothAngle,
  smoothing,
} from "./display/model.js";
import { createJet, createSkyScene } from "./display/scene.js";

export const mountDisplay: DisplayGameModule["mountDisplay"] = (root, ctx) => {
  root.replaceChildren();
  const view = createSkyScene(root);
  const planes = new Map<string, THREE.Group>();
  const shots = new Map<number, THREE.Mesh>();
  const poses = new Map<string, PlanePose>();
  const shotPoses = new Map<number, THREE.Vector3>();
  let state: SkyState | null = null;
  const humanColors = [0x2dd4bf, 0x60a5fa, 0xf59e0b, 0xc084fc];
  const unsubscribe = ctx.subscribe((message) => {
    if (!isSkyState(message.state)) return;
    state = message.state;
    const humans = state.planes.filter((plane) => !plane.bot);
    for (const plane of state.planes)
      if (!planes.has(plane.id)) {
        const humanIndex = plane.bot ? -1 : humans.findIndex((item) => item.id === plane.id);
        const mesh = createJet(
          plane.bot ? 0xd94646 : (humanColors[humanIndex % humanColors.length] ?? 0xffffff),
        );
        planes.set(plane.id, mesh);
        poses.set(plane.id, {
          x: plane.x,
          y: plane.y,
          z: plane.z,
          heading: plane.heading,
          pitch: plane.pitch,
          roll: plane.roll,
        });
        view.scene.add(mesh);
      }
    for (const [id, mesh] of planes)
      if (!state.planes.some((plane) => plane.id === id)) {
        view.scene.remove(mesh);
        planes.delete(id);
        poses.delete(id);
      }
    for (const shot of state.shots)
      if (!shots.has(shot.id)) {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(shot.kind === "missile" ? 0.35 : 0.13, 8, 6),
          new THREE.MeshBasicMaterial({ color: shot.kind === "missile" ? 0xff5630 : 0xfff38a }),
        );
        shots.set(shot.id, mesh);
        shotPoses.set(shot.id, new THREE.Vector3(shot.x, shot.y, shot.z));
        view.scene.add(mesh);
      }
    for (const [id, mesh] of shots)
      if (!state.shots.some((shot) => shot.id === id)) {
        view.scene.remove(mesh);
        shots.delete(id);
        shotPoses.delete(id);
      }
  });
  let raf = 0;
  let previousFrame = performance.now();
  const cameraTarget = new THREE.Vector3();
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
      updatePlanes(state, planes, poses, dt);
      updateShots(state, shots, shotPoses, dt);
      const humans = state.planes.filter((plane) => !plane.bot);
      const me =
        state.planes.find((plane) => plane.id === ctx.playerId && !plane.bot) ??
        humans[0] ??
        state.planes[0];
      const pose = me ? poses.get(me.id) : undefined;
      if (me && pose && me.respawnMs <= 0)
        cameraReady = updateSkyCameraAndHud(
          view,
          state,
          me,
          pose,
          cameraTarget,
          cameraReady,
          dt,
          ctx.mode,
        );
      if (state.phase === "round-over")
        view.center.innerHTML = `<strong style="font-size:clamp(30px,8vw,72px)">ROUND OVER</strong>`;
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

function updatePlanes(
  state: SkyState,
  meshes: Map<string, THREE.Group>,
  poses: Map<string, PlanePose>,
  dt: number,
) {
  const alpha = smoothing(13, dt);
  for (const plane of state.planes) {
    const mesh = meshes.get(plane.id);
    const pose = poses.get(plane.id);
    if (!mesh || !pose) continue;
    const teleported = Math.hypot(plane.x - pose.x, plane.y - pose.y, plane.z - pose.z) > 80;
    pose.x = teleported ? plane.x : THREE.MathUtils.lerp(pose.x, plane.x, alpha);
    pose.y = teleported ? plane.y : THREE.MathUtils.lerp(pose.y, plane.y, alpha);
    pose.z = teleported ? plane.z : THREE.MathUtils.lerp(pose.z, plane.z, alpha);
    pose.heading = teleported ? plane.heading : smoothAngle(pose.heading, plane.heading, alpha);
    pose.pitch = THREE.MathUtils.lerp(pose.pitch, plane.pitch, alpha);
    pose.roll = THREE.MathUtils.lerp(pose.roll, plane.roll, alpha);
    mesh.visible = plane.respawnMs <= 0;
    mesh.position.set(pose.x, pose.y, pose.z);
    mesh.rotation.order = "YXZ";
    mesh.rotation.y = pose.heading;
    mesh.rotation.x = -pose.pitch;
    mesh.rotation.z = -pose.roll;
  }
}
function updateShots(
  state: SkyState,
  meshes: Map<number, THREE.Mesh>,
  poses: Map<number, THREE.Vector3>,
  dt: number,
) {
  const alpha = smoothing(18, dt);
  for (const shot of state.shots) {
    const mesh = meshes.get(shot.id);
    const pose = poses.get(shot.id);
    if (!mesh || !pose) continue;
    pose.lerp(new THREE.Vector3(shot.x, shot.y, shot.z), alpha);
    mesh.position.copy(pose);
  }
}
