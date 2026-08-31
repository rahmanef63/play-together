import type { DisplayGameModule } from "@play-together/game-sdk";
import * as THREE from "three";

interface Racer {
  id: string;
  name: string;
  bot: boolean;
  x: number;
  z: number;
  heading: number;
  speed: number;
  lap: number;
  nextCheckpoint: number;
  nitro: number;
  finished: boolean;
  finishMs: number | null;
}
interface S {
  kind: "turbo-circuit";
  phase: string;
  countdownMs: number;
  raceMs: number;
  lapsToWin: number;
  track: { rx: number; rz: number; width: number; checkpoints: Array<{ x: number; z: number }> };
  racers: Racer[];
  winnerId: string | null;
}
const ok = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as S).kind === "turbo-circuit";
interface RacerPose {
  x: number;
  z: number;
  heading: number;
}
const smoothing = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
const smoothAngle = (current: number, target: number, alpha: number) =>
  current + Math.atan2(Math.sin(target - current), Math.cos(target - current)) * alpha;
function carMesh(color: number) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.7, 4.2),
    new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15 }),
  );
  body.position.y = 0.65;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.6, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.15, metalness: 0.5 }),
  );
  cabin.position.set(0, 1.15, -0.25);
  g.add(cabin);
  const spoiler = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.12, 0.45),
    new THREE.MeshStandardMaterial({ color: 0x0b0f19 }),
  );
  spoiler.position.set(0, 0.95, -1.75);
  g.add(spoiler);
  return g;
}
export const mountDisplay: DisplayGameModule["mountDisplay"] = (root, ctx) => {
  root.replaceChildren();
  const host = document.createElement("section");
  host.style.cssText =
    "position:relative;width:100%;height:100%;min-height:320px;overflow:hidden;background:#86c5ff";
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "display:block;width:100%;height:100%";
  const hud = document.createElement("div");
  hud.style.cssText =
    "position:absolute;inset:0;pointer-events:none;color:white;font:800 14px/1.2 system-ui;text-shadow:0 2px 5px #000;display:flex;flex-direction:column;justify-content:space-between;padding:14px";
  const top = document.createElement("div"),
    bottom = document.createElement("div");
  bottom.style.cssText = "display:flex;gap:12px;align-items:end;justify-content:space-between";
  hud.append(top, bottom);
  host.append(canvas, hud);
  root.append(host);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x8ac9ff);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xaad8ff, 120, 260);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 500);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x50632d, 2.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(-50, 90, -40);
  scene.add(sun);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 420),
    new THREE.MeshStandardMaterial({ color: 0x4f7f32, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.03;
  scene.add(ground);
  const RX = 62,
    RZ = 38,
    W = 16;
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, RX + W / 2, RZ + W / 2, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absellipse(0, 0, RX - W / 2, RZ - W / 2, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const road = new THREE.Mesh(
    new THREE.ShapeGeometry(shape, 96),
    new THREE.MeshStandardMaterial({ color: 0x2b2f35, roughness: 0.95, side: THREE.DoubleSide }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.01;
  scene.add(road);
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf6d44a });
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2,
      x = RX * Math.cos(a),
      z = RZ * Math.sin(a);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 2.8), stripeMat);
    m.position.set(x, 0.05, z);
    m.rotation.y = Math.atan2(-RX * Math.sin(a), RZ * Math.cos(a));
    scene.add(m);
  }
  const barrierMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb });
  for (const sign of [-1, 1])
    for (let i = 0; i < 54; i++) {
      const a = (i / 54) * Math.PI * 2,
        rx = RX + sign * (W / 2 + 1.2),
        rz = RZ + sign * (W / 2 + 1.2);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 2.5), barrierMat);
      m.position.set(rx * Math.cos(a), 0.42, rz * Math.sin(a));
      m.rotation.y = Math.atan2(-rx * Math.sin(a), rz * Math.cos(a));
      scene.add(m);
    }
  const cpMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.35 });
  for (const cp of [
    { x: RX, z: 0 },
    { x: 0, z: RZ },
    { x: -RX, z: 0 },
    { x: 0, z: -RZ },
  ]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.18, 8, 32), cpMat);
    ring.position.set(cp.x, 2.5, cp.z);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
  }
  const cars = new Map<string, THREE.Group>();
  const poses = new Map<string, RacerPose>();
  const colors = [0xef4444, 0x3b82f6, 0xf59e0b, 0x8b5cf6, 0x22c55e, 0x06b6d4, 0xf97316];
  let state: S | null = null;
  const unsub = ctx.subscribe((m) => {
    if (!ok(m.state)) return;
    state = m.state;
    for (const [i, r] of state.racers.entries()) {
      let mesh = cars.get(r.id);
      if (!mesh) {
        mesh = carMesh(r.bot ? 0xd1d5db : (colors[i % colors.length] ?? 0xffffff));
        cars.set(r.id, mesh);
        poses.set(r.id, { x: r.x, z: r.z, heading: r.heading });
        scene.add(mesh);
      }
    }
    for (const [id, mesh] of cars)
      if (!state.racers.some((r) => r.id === id)) {
        scene.remove(mesh);
        cars.delete(id);
        poses.delete(id);
      }
  });
  let raf = 0;
  let previousFrame = performance.now();
  const cameraTarget = new THREE.Vector3();
  let cameraReady = false;
  let viewWidth = 0;
  let viewHeight = 0;
  const resize = () => {
    const w = Math.max(2, Math.round(host.clientWidth));
    const h = Math.max(2, Math.round(host.clientHeight));
    if (w === viewWidth && h === viewHeight) return;
    viewWidth = w;
    viewHeight = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();
  const loop = (now = performance.now()) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, Math.max(0.001, (now - previousFrame) / 1000));
    previousFrame = now;
    if (state) {
      const poseAlpha = smoothing(14, dt);
      for (const r of state.racers) {
        const mesh = cars.get(r.id);
        const pose = poses.get(r.id);
        if (!mesh || !pose) continue;
        const teleported = Math.hypot(r.x - pose.x, r.z - pose.z) > 30;
        pose.x = teleported ? r.x : THREE.MathUtils.lerp(pose.x, r.x, poseAlpha);
        pose.z = teleported ? r.z : THREE.MathUtils.lerp(pose.z, r.z, poseAlpha);
        pose.heading = teleported ? r.heading : smoothAngle(pose.heading, r.heading, poseAlpha);
        mesh.position.set(pose.x, 0, pose.z);
        mesh.rotation.y = pose.heading;
      }
      const humans = state.racers.filter((r) => !r.bot);
      const me =
        state.racers.find((r) => r.id === ctx.playerId && !r.bot) ?? humans[0] ?? state.racers[0];
      const mePose = me ? poses.get(me.id) : undefined;
      if (me && mePose) {
        const back = ctx.mode === "handheld" ? 11 + Math.min(7, Math.abs(me.speed) * 0.12) : 19;
        const desiredCamera = new THREE.Vector3(
          mePose.x - Math.sin(mePose.heading) * back,
          ctx.mode === "handheld" ? 5.6 : 10.5,
          mePose.z - Math.cos(mePose.heading) * back,
        );
        const desiredTarget = new THREE.Vector3(
          mePose.x,
          ctx.mode === "handheld" ? 1.2 : 1,
          mePose.z,
        );
        if (!cameraReady) {
          camera.position.copy(desiredCamera);
          cameraTarget.copy(desiredTarget);
          cameraReady = true;
        } else {
          camera.position.lerp(desiredCamera, smoothing(ctx.mode === "handheld" ? 9 : 6, dt));
          cameraTarget.lerp(desiredTarget, smoothing(11, dt));
        }
        camera.lookAt(cameraTarget);
        const order = [...state.racers].sort(
          (a, b) => b.lap * 4 + b.nextCheckpoint - (a.lap * 4 + a.nextCheckpoint),
        );
        const pos = Math.max(1, order.findIndex((r) => r.id === me.id) + 1);
        top.textContent =
          state.phase === "countdown"
            ? `STARTING IN ${Math.max(1, Math.ceil(state.countdownMs / 1000))}`
            : state.phase === "finished"
              ? "RACE COMPLETE"
              : `LAP ${Math.min(me.lap + 1, state.lapsToWin)}/${state.lapsToWin} · POSITION ${pos}/${state.racers.length}`;
        bottom.innerHTML = `<strong style="font-size:clamp(24px,7vw,52px)">${Math.round(Math.max(0, me.speed) * 4.2)}<small style="font-size:.35em"> km/h</small></strong><strong>N₂O ${Math.round(me.nitro)}%</strong>`;
      }
    }
    renderer.render(scene, camera);
  };
  loop();
  return () => {
    cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    unsub();
    renderer.dispose();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material;
      if (Array.isArray(mat))
        mat.forEach((x) => {
          x.dispose();
        });
      else mat?.dispose?.();
    });
    root.replaceChildren();
  };
};
