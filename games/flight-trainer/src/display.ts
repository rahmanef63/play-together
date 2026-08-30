import type { DisplayGameModule } from "@play-together/game-sdk";
import * as THREE from "three";

interface A {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  heading: number;
  pitch: number;
  roll: number;
  airspeed: number;
  verticalSpeed: number;
  throttle: number;
  flaps: boolean;
  gearDown: boolean;
  stall: boolean;
  crashed: boolean;
  landed: boolean;
  missionComplete: boolean;
  nextCheckpoint: number;
  elapsedMs: number;
  score: number;
}
interface S {
  kind: "flight-trainer";
  runway: { x: number; zMin: number; zMax: number; width: number };
  checkpoints: Array<{ x: number; y: number; z: number; label: string }>;
  aircraft: A[];
}
const ok = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as any).kind === "flight-trainer";
function planeMesh(color: number) {
  const g = new THREE.Group(),
    mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15 }),
    dark = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.35, metalness: 0.2 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.6, 5.2, 12), mat);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(7, 0.12, 1.05), mat);
  wing.position.z = -0.2;
  g.add(wing);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 0.7), mat);
  tail.position.z = -2.25;
  g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.8), mat);
  fin.position.set(0, 0.55, -2.2);
  g.add(fin);
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    dark,
  );
  canopy.scale.set(1, 0.75, 1.25);
  canopy.position.set(0, 0.5, 0.55);
  g.add(canopy);
  return g;
}
export const mountDisplay: DisplayGameModule["mountDisplay"] = (root, ctx) => {
  root.replaceChildren();
  const host = document.createElement("section");
  host.style.cssText =
    "position:relative;width:100%;height:100%;min-height:320px;overflow:hidden;background:#87ceeb";
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "width:100%;height:100%;display:block";
  const hud = document.createElement("div");
  hud.style.cssText =
    "position:absolute;inset:0;pointer-events:none;color:white;font:800 13px system-ui;text-shadow:0 2px 4px #000;padding:12px;display:grid;grid-template-rows:auto 1fr auto";
  const top = document.createElement("div"),
    middle = document.createElement("div"),
    bottom = document.createElement("div");
  middle.style.cssText = "display:grid;place-items:center";
  bottom.style.cssText = "display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:8px";
  const horizon = document.createElement("div");
  horizon.style.cssText =
    "width:116px;height:116px;border:3px solid #e2e8f0;border-radius:50%;overflow:hidden;position:relative;background:linear-gradient(#4ea4dc 0 50%,#7c5b35 50%);box-shadow:0 0 0 2px #0008";
  const line = document.createElement("div");
  line.style.cssText =
    "position:absolute;left:-30%;right:-30%;top:50%;height:3px;background:white;transform-origin:center";
  const wings = document.createElement("div");
  wings.style.cssText = "position:absolute;left:18%;right:18%;top:49%;border-top:3px solid #facc15";
  horizon.append(line, wings);
  middle.append(horizon);
  hud.append(top, middle, bottom);
  host.append(canvas, hud);
  root.append(host);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x88cfee);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xb9dcf0, 180, 650);
  const camera = new THREE.PerspectiveCamera(66, 1, 0.1, 1000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x4d5e33, 2.25));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(-100, 180, -80);
  scene.add(sun);
  const terrain = new THREE.Mesh(
    new THREE.PlaneGeometry(1000, 1000, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x567a35, roughness: 1 }),
  );
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.02;
  scene.add(terrain);
  const runway = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 130),
    new THREE.MeshStandardMaterial({ color: 0x30343b, roughness: 0.95 }),
  );
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(0, 0.02, -110);
  scene.add(runway);
  const markMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let z = -166; z < -50; z += 12) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 6), markMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 0.04, z);
    scene.add(m);
  }
  for (const x of [-10.3, 10.3])
    for (let z = -170; z < -46; z += 8) {
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 6, 4),
        new THREE.MeshBasicMaterial({ color: 0xeaf8ff }),
      );
      light.position.set(x, 0.18, z);
      scene.add(light);
    }
  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x53633d, roughness: 1 });
  for (let i = 0; i < 34; i++) {
    const a = i * 1.91,
      r = 150 + (i % 8) * 28,
      h = 30 + (i % 7) * 10;
    const m = new THREE.Mesh(new THREE.ConeGeometry(20 + (i % 5) * 5, h, 7), mountainMat);
    m.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r - 15);
    scene.add(m);
  }
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.62,
  });
  const rings = [
    { x: 0, y: 24, z: -25 },
    { x: 78, y: 45, z: 35 },
    { x: 25, y: 68, z: 125 },
    { x: -92, y: 56, z: 82 },
    { x: -72, y: 38, z: -18 },
    { x: 0, y: 16, z: -78 },
  ].map((p) => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(8, 0.45, 10, 40), ringMat.clone());
    r.position.set(p.x, p.y, p.z);
    scene.add(r);
    return r;
  });
  const planes = new Map<string, THREE.Group>();
  let state: S | null = null;
  const colors = [0xf97316, 0x38bdf8, 0xa78bfa, 0x22c55e];
  const unsub = ctx.subscribe((m) => {
    if (!ok(m.state)) return;
    state = m.state;
    for (const [i, a] of state.aircraft.entries()) {
      let mesh = planes.get(a.id);
      if (!mesh) {
        mesh = planeMesh(colors[i % colors.length] ?? 0xffffff);
        planes.set(a.id, mesh);
        scene.add(mesh);
      }
      mesh.visible = !a.crashed;
      mesh.position.set(a.x, a.y, a.z);
      mesh.rotation.order = "YXZ";
      mesh.rotation.y = a.heading;
      mesh.rotation.x = -a.pitch;
      mesh.rotation.z = -a.roll;
    }
    for (const [id, mesh] of planes)
      if (!state.aircraft.some((a) => a.id === id)) {
        scene.remove(mesh);
        planes.delete(id);
      }
    rings.forEach((r, i) => {
      const active = state?.aircraft.some((a) => a.nextCheckpoint === i && !a.missionComplete);
      (r.material as THREE.MeshBasicMaterial).opacity = active ? 0.8 : 0.18;
    });
  });
  let raf = 0;
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
  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (state) {
      const me = state.aircraft.find((a) => a.id === ctx.playerId) ?? state.aircraft[0];
      if (me) {
        const f = {
            x: Math.sin(me.heading) * Math.cos(me.pitch),
            y: Math.sin(me.pitch),
            z: Math.cos(me.heading) * Math.cos(me.pitch),
          },
          right = { x: Math.cos(me.heading), y: 0, z: -Math.sin(me.heading) };
        if (ctx.mode === "handheld") {
          camera.position.lerp(new THREE.Vector3(me.x, me.y + 1.05, me.z), 0.32);
          camera.up.set(
            right.x * Math.sin(me.roll),
            Math.cos(me.roll),
            right.z * Math.sin(me.roll),
          );
          camera.lookAt(me.x + f.x * 45, me.y + 1 + f.y * 45, me.z + f.z * 45);
        } else {
          camera.position.lerp(
            new THREE.Vector3(me.x - f.x * 18, me.y + 7 - f.y * 4, me.z - f.z * 18),
            0.12,
          );
          camera.up.set(0, 1, 0);
          camera.lookAt(me.x + f.x * 10, me.y + f.y * 8, me.z + f.z * 10);
        }
        const cp = state.checkpoints[me.nextCheckpoint];
        top.textContent = me.crashed
          ? "AIRCRAFT DOWN · RESTART FROM CONTROLLER"
          : me.missionComplete
            ? `MISSION COMPLETE · SCORE ${me.score}`
            : `FLIGHT TRAINER · NEXT ${cp?.label ?? "LAND"} · SCORE ${me.score}`;
        line.style.transform = `translateY(${Math.round(me.pitch * 85)}px) rotate(${Math.round(me.roll * 57.3)}deg)`;
        bottom.innerHTML = `<strong>${Math.round(me.airspeed * 1.94)} kt<br><small>AIRSPEED</small></strong><strong style="text-align:center;color:${me.stall ? "#ff6b6b" : "white"}">${me.stall ? "STALL" : "HDG " + String(Math.round(((me.heading * 180) / Math.PI + 360) % 360)).padStart(3, "0")}<br><small>${me.gearDown ? "GEAR DOWN" : "GEAR UP"} · ${me.flaps ? "FLAPS" : "CLEAN"}</small></strong><strong style="text-align:right">${Math.round(me.y)} m<br><small>ALT · VSI ${me.verticalSpeed.toFixed(1)}</small></strong>`;
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
