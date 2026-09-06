import type { DisplayGameModule } from "@play-together/game-sdk";
import * as THREE from "three";
import { createArena } from "./display/arena.js";
import { type FighterVisual, fighterAsset, pose } from "./display/fighters.js";
import { hud, makeHud } from "./display/hud.js";
import { type ArenaState, isArenaState } from "./display/model.js";

const assetName = (side: number) => (side ? "fighter.kite-vale" : "fighter.nova-rin");
export const mountDisplay: DisplayGameModule["mountDisplay"] = (root, context) => {
  const ui = makeHud(root),
    view = createArena(),
    meshes = new Map<string, FighterVisual>(),
    pending = new Set<string>();
  ui.host.append(view.renderer.domElement);
  let state: ArenaState | null = null,
    disposed = false;
  const ensureFighter = (id: string, side: number) => {
    if (meshes.has(id) || pending.has(id)) return;
    pending.add(id);
    void context
      .loadAsset(assetName(side))
      .then(fighterAsset)
      .then((model) => {
        pending.delete(id);
        if (disposed) return;
        meshes.set(id, model);
        view.scene.add(model);
        ui.host.dataset.fighterAssets = String(meshes.size);
        ui.host.dataset.fighterAssetFormat = "glb";
        context.setStatus(`Fighters ready ${meshes.size}`);
      })
      .catch((error) => {
        pending.delete(id);
        if (!disposed)
          context.setStatus(`Fighter asset unavailable: ${String(error).slice(0, 96)}`);
      });
  };
  const off = context.subscribe((message) => {
    if (!isArenaState(message.state)) return;
    state = message.state;
    const active = new Set(state.fighters.map((fighter) => fighter.id));
    for (const [id, model] of meshes)
      if (!active.has(id)) {
        view.scene.remove(model);
        meshes.delete(id);
        ui.host.dataset.fighterAssets = String(meshes.size);
      }
    for (const fighter of state.fighters) ensureFighter(fighter.id, fighter.side);
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
      for (const fighter of state.fighters) {
        const model = meshes.get(fighter.id);
        if (model) pose(model, fighter, dt);
      }
      hud(ui, state);
    }
    if (state?.fighters.length) {
      const xs = state.fighters.map((f) => f.x),
        center = (Math.min(...xs) + Math.max(...xs)) / 2,
        first = xs[0] ?? 0,
        second = xs[1] ?? first,
        spread = Math.min(4, Math.max(0, Math.abs(first - second) - 1)),
        impact = state.fighters.some((f) => f.stun > 0 && f.flash.includes("HIT")),
        shake = impact ? Math.sin(now * 0.08) * 0.07 : 0;
      view.camera.position.lerp(
        new THREE.Vector3(center + shake, 4.35 + spread * 0.1, 8.6 + spread * 0.32),
        Math.min(1, dt * 3),
      );
      view.camera.lookAt(center, 1 + shake * 0.4, 0);
    }
    view.renderer.render(view.scene, view.camera);
  };
  raf = requestAnimationFrame(loop);
  for (const side of [0, 1]) void context.loadAsset(assetName(side)).catch(() => undefined);
  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    observer.disconnect();
    off();
    for (const model of meshes.values()) view.scene.remove(model);
    view.renderer.dispose();
    root.replaceChildren();
  };
};
