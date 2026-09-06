import type { DisplayGameModule } from "@play-together/game-sdk";
import * as THREE from "three";
import { createArena } from "./display/arena.js";
import { fighterMesh, pose } from "./display/fighters.js";
import { hud, makeHud } from "./display/hud.js";
import { type ArenaState, isArenaState } from "./display/model.js";
export const mountDisplay: DisplayGameModule["mountDisplay"] = (root, context) => {
  const ui = makeHud(root),
    view = createArena(),
    meshes = new Map<string, ReturnType<typeof fighterMesh>>();
  ui.host.append(view.renderer.domElement);
  let state: ArenaState | null = null;
  const off = context.subscribe((message) => {
    if (!isArenaState(message.state)) return;
    state = message.state;
    for (const f of state.fighters)
      if (!meshes.has(f.id)) {
        const m = fighterMesh(f.side ? 0x65d6ff : 0xff5b7d);
        meshes.set(f.id, m);
        view.scene.add(m);
      }
  });
  let w = 0,
    h = 0;
  const resize = () => {
    w = Math.max(2, ui.host.clientWidth);
    h = Math.max(2, ui.host.clientHeight);
    view.renderer.setSize(w, h, false);
    view.camera.aspect = w / h;
    view.camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(ui.host);
  resize();
  let last = performance.now(),
    raf = 0;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state) {
      for (const f of state.fighters) {
        const m = meshes.get(f.id);
        if (m) pose(m, f, dt);
      }
      hud(ui, state);
    }
    if (state?.fighters.length) {
      const xs = state.fighters.map((f) => f.x),
        center = (Math.min(...xs) + Math.max(...xs)) / 2,
        first = xs[0] ?? 0,
        second = xs[1] ?? first,
        spread = Math.min(4, Math.max(0, Math.abs(first - second) - 1));
      const impact = state.fighters.some(
        (fighter) => fighter.stun > 0 && fighter.flash.includes("HIT"),
      );
      const shake = impact ? Math.sin(now * 0.08) * 0.07 : 0;
      view.camera.position.lerp(
        new THREE.Vector3(center + shake, 4.35 + spread * 0.1, 8.6 + spread * 0.32),
        Math.min(1, dt * 3),
      );
      view.camera.lookAt(center, 1.0 + shake * 0.4, 0);
    }
    view.renderer.render(view.scene, view.camera);
  };
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf);
    observer.disconnect();
    off();
    view.renderer.dispose();
    root.replaceChildren();
  };
};
