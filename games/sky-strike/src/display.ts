import type { DisplayGameModule } from "@play-together/game-sdk";
import * as THREE from "three";

interface Plane {
  id: string;
  name: string;
  bot: boolean;
  x: number;
  y: number;
  z: number;
  heading: number;
  pitch: number;
  roll: number;
  speed: number;
  hp: number;
  kills: number;
  deaths: number;
  respawnMs: number;
  lockId: string | null;
}
interface Shot {
  id: number;
  kind: "bullet" | "missile";
  ownerId: string;
  targetId: string | null;
  x: number;
  y: number;
  z: number;
}
interface S {
  kind: "sky-strike";
  phase: string;
  round: number;
  roundResetMs: number;
  winnerId: string | null;
  planes: Plane[];
  shots: Shot[];
}
const ok = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as S).kind === "sky-strike";
interface PlanePose {
  x: number;
  y: number;
  z: number;
  heading: number;
  pitch: number;
  roll: number;
}
const smoothing = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
const smoothAngle = (current: number, target: number, alpha: number) =>
  current + Math.atan2(Math.sin(target - current), Math.cos(target - current)) * alpha;
function jet(color: number) {
  const g = new THREE.Group(),
    mat = new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.35 }),
    dark = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.5, roughness: 0.25 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.75, 5.6, 10), mat);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.5, 10), mat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = 3.5;
  g.add(nose);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.12, 1.15), mat);
  wing.position.z = -0.3;
  g.add(wing);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 0.7), mat);
  tail.position.z = -2.25;
  g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.35, 0.9), mat);
  fin.position.set(0, 0.65, -2.25);
  g.add(fin);
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    dark,
  );
  canopy.scale.set(1, 0.75, 1.4);
  canopy.position.set(0, 0.5, 0.75);
  g.add(canopy);
  return g;
}
export const mountDisplay: DisplayGameModule["mountDisplay"] = (root, ctx) => {
  root.replaceChildren();
  const host = document.createElement("section");
  host.style.cssText =
    "position:relative;width:100%;height:100%;min-height:320px;overflow:hidden;background:#4da3df";
  const canvas = document.createElement("canvas"),
    hud = document.createElement("div");
  canvas.style.cssText = "width:100%;height:100%;display:block";
  hud.style.cssText =
    "position:absolute;inset:0;pointer-events:none;color:#eefcff;font:900 14px system-ui;text-shadow:0 2px 5px #001;padding:12px;display:grid;grid-template-rows:auto 1fr auto";
  const top = document.createElement("div"),
    center = document.createElement("div"),
    bottom = document.createElement("div");
  center.style.cssText = "display:grid;place-items:center";
  bottom.style.cssText = "display:flex;justify-content:space-between;align-items:end";
  hud.append(top, center, bottom);
  host.append(canvas, hud);
  root.append(host);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x69b7e8);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x91d1ef, 180, 520);
  const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 900);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x284a58, 2.3));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(80, 140, -70);
  scene.add(sun);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(1100, 1100),
    new THREE.MeshStandardMaterial({ color: 0x1a6890, roughness: 0.8, metalness: 0.08 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = 0;
  scene.add(sea);
  const islandMat = new THREE.MeshStandardMaterial({ color: 0x657b3b, roughness: 1 });
  for (let i = 0; i < 18; i++) {
    const a = i * 1.93,
      r = 70 + (i % 6) * 42,
      h = 7 + (i % 4) * 6;
    const m = new THREE.Mesh(new THREE.ConeGeometry(12 + (i % 3) * 6, h, 7), islandMat);
    m.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
    scene.add(m);
  }
  const cloudMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.45,
  });
  for (let i = 0; i < 20; i++) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(7 + (i % 4) * 2, 8, 6), cloudMat);
    c.scale.set(2, 0.55, 1);
    c.position.set(Math.sin(i * 2.7) * 230, 70 + (i % 5) * 14, Math.cos(i * 1.8) * 230);
    scene.add(c);
  }
  const meshes = new Map<string, THREE.Group>(),
    shots = new Map<number, THREE.Mesh>();
  const poses = new Map<string, PlanePose>();
  const shotPoses = new Map<number, THREE.Vector3>();
  let state: S | null = null;
  const humanColors = [0x2dd4bf, 0x60a5fa, 0xf59e0b, 0xc084fc];
  const unsub = ctx.subscribe((m) => {
    if (!ok(m.state)) return;
    state = m.state;
    const humans = state.planes.filter((plane) => !plane.bot);
    for (const p of state.planes) {
      let mesh = meshes.get(p.id);
      if (!mesh) {
        const humanIndex = p.bot ? -1 : humans.findIndex((plane) => plane.id === p.id);
        mesh = jet(p.bot ? 0xd94646 : (humanColors[humanIndex % humanColors.length] ?? 0xffffff));
        meshes.set(p.id, mesh);
        poses.set(p.id, {
          x: p.x,
          y: p.y,
          z: p.z,
          heading: p.heading,
          pitch: p.pitch,
          roll: p.roll,
        });
        scene.add(mesh);
      }
    }
    for (const [id, msh] of meshes)
      if (!state.planes.some((p) => p.id === id)) {
        scene.remove(msh);
        meshes.delete(id);
        poses.delete(id);
      }
    for (const s of state.shots) {
      let mesh = shots.get(s.id);
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(s.kind === "missile" ? 0.35 : 0.13, 8, 6),
          new THREE.MeshBasicMaterial({ color: s.kind === "missile" ? 0xff5630 : 0xfff38a }),
        );
        shots.set(s.id, mesh);
        shotPoses.set(s.id, new THREE.Vector3(s.x, s.y, s.z));
        scene.add(mesh);
      }
    }
    for (const [id, msh] of shots)
      if (!state.shots.some((s) => s.id === id)) {
        scene.remove(msh);
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
      const poseAlpha = smoothing(13, dt);
      for (const p of state.planes) {
        const mesh = meshes.get(p.id);
        const pose = poses.get(p.id);
        if (!mesh || !pose) continue;
        const teleported = Math.hypot(p.x - pose.x, p.y - pose.y, p.z - pose.z) > 80;
        pose.x = teleported ? p.x : THREE.MathUtils.lerp(pose.x, p.x, poseAlpha);
        pose.y = teleported ? p.y : THREE.MathUtils.lerp(pose.y, p.y, poseAlpha);
        pose.z = teleported ? p.z : THREE.MathUtils.lerp(pose.z, p.z, poseAlpha);
        pose.heading = teleported ? p.heading : smoothAngle(pose.heading, p.heading, poseAlpha);
        pose.pitch = THREE.MathUtils.lerp(pose.pitch, p.pitch, poseAlpha);
        pose.roll = THREE.MathUtils.lerp(pose.roll, p.roll, poseAlpha);
        mesh.visible = p.respawnMs <= 0;
        mesh.position.set(pose.x, pose.y, pose.z);
        mesh.rotation.order = "YXZ";
        mesh.rotation.y = pose.heading;
        mesh.rotation.x = -pose.pitch;
        mesh.rotation.z = -pose.roll;
      }
      const shotAlpha = smoothing(18, dt);
      for (const shot of state.shots) {
        const mesh = shots.get(shot.id);
        const pose = shotPoses.get(shot.id);
        if (!mesh || !pose) continue;
        pose.lerp(new THREE.Vector3(shot.x, shot.y, shot.z), shotAlpha);
        mesh.position.copy(pose);
      }
      const humans = state.planes.filter((p) => !p.bot),
        me =
          state.planes.find((p) => p.id === ctx.playerId && !p.bot) ?? humans[0] ?? state.planes[0];
      const mePose = me ? poses.get(me.id) : undefined;
      if (me && mePose && me.respawnMs <= 0) {
        const f = {
            x: Math.sin(mePose.heading) * Math.cos(mePose.pitch),
            y: Math.sin(mePose.pitch),
            z: Math.cos(mePose.heading) * Math.cos(mePose.pitch),
          },
          right = { x: -Math.cos(mePose.heading), z: Math.sin(mePose.heading) };
        const chase = ctx.mode === "handheld" ? 13 : 19;
        const desiredCamera = new THREE.Vector3(
          mePose.x - f.x * chase + right.x * mePose.roll * 2,
          mePose.y + 5 - f.y * 5,
          mePose.z - f.z * chase + right.z * mePose.roll * 2,
        );
        const desiredTarget = new THREE.Vector3(
          mePose.x + f.x * 12,
          mePose.y + f.y * 10,
          mePose.z + f.z * 12,
        );
        if (!cameraReady) {
          camera.position.copy(desiredCamera);
          cameraTarget.copy(desiredTarget);
          cameraReady = true;
        } else {
          camera.position.lerp(desiredCamera, smoothing(8, dt));
          cameraTarget.lerp(desiredTarget, smoothing(11, dt));
        }
        camera.lookAt(cameraTarget);
        const target = state.planes.find((p) => p.id === me.lockId);
        top.textContent = `SKY STRIKE · ROUND ${state.round} · KILLS ${me.kills} · HP ${Math.round(me.hp)}%`;
        center.innerHTML = target
          ? `<div style="width:58px;height:58px;border:3px solid #ff4747;border-radius:50%;display:grid;place-items:center">LOCK</div>`
          : `<div style="width:42px;height:42px;border:2px solid #fff8;border-radius:50%"></div>`;
        bottom.innerHTML = `<strong>${Math.round(me.speed * 3.6)} km/h</strong><strong>ALT ${Math.round(me.y)} m</strong>`;
      }
      if (state.phase === "round-over")
        center.innerHTML = `<strong style="font-size:clamp(30px,8vw,72px)">ROUND OVER</strong>`;
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
      m.geometry?.dispose?.();
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
