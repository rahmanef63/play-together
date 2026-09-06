import type { DisplayGameModule } from "@play-together/game-sdk";
import * as THREE from "three";
import { createArena } from "./display/arena.js";
import { type FighterVisual, fighterAsset, pose } from "./display/fighters.js";
import { createFightFlow, updateFightFlow } from "./display/flow.js";
import { hud, makeHud } from "./display/hud.js";
import {
  type ArenaState,
  type CharacterId,
  isArenaState,
  type ViewFighter,
} from "./display/model.js";

const assetName = (character: CharacterId) => `fighter.${character}`;

export const mountDisplay: DisplayGameModule["mountDisplay"] = (root, context) => {
  const ui = makeHud(root);
  const flow = createFightFlow(ui.host);
  const view = createArena();
  const meshes = new Map<string, FighterVisual>();
  const meshCharacters = new Map<string, CharacterId>();
  const pending = new Map<string, CharacterId>();
  ui.host.append(view.renderer.domElement);
  let state: ArenaState | null = null;
  let disposed = false;

  const removeFighter = (id: string) => {
    const model = meshes.get(id);
    if (model) view.scene.remove(model);
    meshes.delete(id);
    meshCharacters.delete(id);
    ui.host.dataset.fighterAssets = String(meshes.size);
  };
  const ensureFighter = (fighter: ViewFighter) => {
    if (meshCharacters.get(fighter.id) === fighter.character) return;
    if (pending.get(fighter.id) === fighter.character) return;
    removeFighter(fighter.id);
    pending.set(fighter.id, fighter.character);
    const requested = fighter.character;
    void context
      .loadAsset(assetName(requested))
      .then(fighterAsset)
      .then((model) => {
        if (pending.get(fighter.id) !== requested || disposed) return;
        pending.delete(fighter.id);
        const latest = state?.fighters.find((candidate) => candidate.id === fighter.id);
        if (!latest || latest.character !== requested) return;
        meshes.set(fighter.id, model);
        meshCharacters.set(fighter.id, requested);
        view.scene.add(model);
        ui.host.dataset.fighterAssets = String(meshes.size);
        ui.host.dataset.fighterAssetFormat = "glb";
        context.setStatus(`Fighters ready ${meshes.size}`);
      })
      .catch((error) => {
        if (pending.get(fighter.id) === requested) pending.delete(fighter.id);
        if (!disposed)
          context.setStatus(`Fighter asset unavailable: ${String(error).slice(0, 96)}`);
      });
  };

  const off = context.subscribe((message) => {
    if (!isArenaState(message.state)) return;
    state = message.state;
    const active = new Set(state.fighters.map((fighter) => fighter.id));
    for (const id of meshes.keys()) if (!active.has(id)) removeFighter(id);
    for (const fighter of state.fighters) ensureFighter(fighter);
    updateFightFlow(flow, state);
  });

  const resize = () => {
    const width = Math.max(2, ui.host.clientWidth);
    const height = Math.max(2, ui.host.clientHeight);
    view.renderer.setSize(width, height, false);
    view.camera.aspect = width / height;
    view.camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(ui.host);
  resize();

  let last = performance.now();
  let raf = 0;
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
      frameCamera(view.camera, state, now, dt);
    }
    view.renderer.render(view.scene, view.camera);
  };
  raf = requestAnimationFrame(loop);
  for (const character of ["nova-rin", "kite-vale"] as const) {
    void context.loadAsset(assetName(character)).catch(() => undefined);
  }

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    observer.disconnect();
    off();
    for (const id of [...meshes.keys()]) removeFighter(id);
    view.renderer.dispose();
    root.replaceChildren();
  };
};

function frameCamera(camera: THREE.PerspectiveCamera, state: ArenaState, now: number, dt: number) {
  if (!state.fighters.length) return;
  const xs = state.fighters.map((fighter) => fighter.x);
  const center = (Math.min(...xs) + Math.max(...xs)) / 2;
  const first = xs[0] ?? 0;
  const second = xs[1] ?? first;
  const spread = Math.min(4, Math.max(0, Math.abs(first - second) - 1));
  const impact = state.fighters.some(
    (fighter) => fighter.stun > 0 && fighter.flash.includes("HIT"),
  );
  const shake = impact ? Math.sin(now * 0.08) * 0.07 : 0;
  camera.position.lerp(
    new THREE.Vector3(center + shake, 4.35 + spread * 0.1, 8.6 + spread * 0.32),
    Math.min(1, dt * 3),
  );
  camera.lookAt(center, 1 + shake * 0.4, 0);
}
