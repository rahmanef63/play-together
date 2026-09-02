import * as THREE from "three";
import { carById } from "../shared/catalog.js";
import { createKartModel, type KartVisual } from "./kartModel.js";
import { smoothAngle, smoothing } from "./math.js";
import type { Racer, RacerPose } from "./model.js";

export class VehicleRenderer {
  readonly #scene: THREE.Scene;
  readonly #mapSvg: SVGSVGElement;
  readonly #mapDots: Map<string, SVGCircleElement>;
  readonly #cars = new Map<string, KartVisual>();
  readonly #poses = new Map<string, RacerPose>();
  readonly #cockpitHidden = new Set<string>();
  constructor(
    scene: THREE.Scene,
    mapSvg: SVGSVGElement,
    mapDots: Map<string, SVGCircleElement>,
    host: HTMLElement,
  ) {
    this.#scene = scene;
    this.#mapSvg = mapSvg;
    this.#mapDots = mapDots;
    host.dataset.assetState = "procedural";
  }
  sync(racers: Racer[]) {
    for (const [index, racer] of racers.entries()) {
      let visual = this.#cars.get(racer.id);
      if (visual && visual.carId !== racer.carId) {
        this.#removeVisual(racer.id, visual);
        visual = undefined;
      }
      if (!visual) {
        visual = createKartModel(carById(racer.carId));
        this.#cars.set(racer.id, visual);
        this.#poses.set(racer.id, { x: racer.x, z: racer.z, heading: racer.heading });
        this.#scene.add(visual.root);
      }
      this.#ensureMapDot(racer, index);
    }
    for (const [id, visual] of this.#cars) {
      if (racers.some((racer) => racer.id === id)) continue;
      this.#removeVisual(id, visual);
      this.#mapDots.get(id)?.remove();
      this.#mapDots.delete(id);
    }
  }
  update(racers: Racer[], dt: number) {
    const alpha = smoothing(14, dt);
    for (const racer of racers) {
      const visual = this.#cars.get(racer.id),
        pose = this.#poses.get(racer.id);
      if (!visual || !pose) continue;
      const teleported = Math.hypot(racer.x - pose.x, racer.z - pose.z) > 28;
      pose.x = teleported ? racer.x : THREE.MathUtils.lerp(pose.x, racer.x, alpha);
      pose.z = teleported ? racer.z : THREE.MathUtils.lerp(pose.z, racer.z, alpha);
      pose.heading = teleported ? racer.heading : smoothAngle(pose.heading, racer.heading, alpha);
      visual.root.position.set(pose.x, 0, pose.z);
      visual.root.rotation.y = pose.heading;
      animateKart(visual, racer, dt);
      visual.root.visible = this.#visible(racer);
      const dot = this.#mapDots.get(racer.id);
      if (dot) {
        dot.setAttribute("cx", pose.x.toFixed(2));
        dot.setAttribute("cy", pose.z.toFixed(2));
      }
    }
  }
  setCockpit(playerId: string, cockpit: boolean) {
    if (cockpit) this.#cockpitHidden.add(playerId);
    else this.#cockpitHidden.delete(playerId);
    const visual = this.#cars.get(playerId);
    if (visual && cockpit) visual.root.visible = false;
  }
  resetMapDots() {
    for (const dot of this.#mapDots.values()) dot.remove();
    this.#mapDots.clear();
  }
  pose(id: string): RacerPose | undefined {
    return this.#poses.get(id);
  }
  dispose() {
    for (const [id, visual] of this.#cars) this.#removeVisual(id, visual);
    this.resetMapDots();
  }
  #visible(racer: Racer) {
    if (this.#cockpitHidden.has(racer.id)) return false;
    if (racer.invulnerableTimer <= 0) return true;
    return Math.floor(racer.invulnerableTimer * 12) % 2 === 0;
  }
  #ensureMapDot(racer: Racer, index: number) {
    if (this.#mapDots.has(racer.id)) return;
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("r", racer.bot ? "1.7" : "2.7");
    dot.setAttribute("fill", racer.bot ? "#d5d5d1" : `hsl(${(index * 71) % 360} 82% 62%)`);
    dot.setAttribute("stroke", "#111a");
    dot.setAttribute("stroke-width", ".8");
    this.#mapSvg.append(dot);
    this.#mapDots.set(racer.id, dot);
  }
  #removeVisual(id: string, visual: KartVisual) {
    this.#scene.remove(visual.root);
    visual.root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) for (const item of material) item.dispose();
      else material?.dispose?.();
    });
    this.#cars.delete(id);
    this.#poses.delete(id);
    this.#cockpitHidden.delete(id);
  }
}
function animateKart(visual: KartVisual, racer: Racer, dt: number) {
  const wheelSpin = racer.speed * dt * 1.7;
  for (const wheel of visual.wheels) wheel.rotation.x += wheelSpin;
  for (const wheel of visual.frontWheels)
    wheel.rotation.y = THREE.MathUtils.lerp(
      wheel.rotation.y,
      -racer.steering * 0.42,
      smoothing(12, dt),
    );
  const targetRoll = racer.drifting ? racer.steering * 0.22 : racer.steering * 0.08;
  visual.body.rotation.z = THREE.MathUtils.lerp(
    visual.body.rotation.z,
    targetRoll,
    smoothing(9, dt),
  );
  visual.steeringWheel.rotation.z = THREE.MathUtils.lerp(
    visual.steeringWheel.rotation.z,
    -racer.steering * 0.74,
    smoothing(13, dt),
  );
  for (const flame of visual.exhaustFlames) {
    flame.visible = racer.boostTimer > 0;
    if (flame.visible) {
      const pulse = 0.82 + Math.abs(Math.sin(performance.now() * 0.025)) * 0.46;
      flame.scale.set(pulse, pulse, pulse);
    }
  }
  for (const spark of visual.driftSparks) {
    spark.visible = racer.driftTier > 0;
    if (!spark.visible) continue;
    const material = spark.material as THREE.MeshBasicMaterial;
    material.color.setHex(racer.driftTier === 2 ? 0xf97316 : 0x38bdf8);
    spark.rotation.x += dt * 23;
    spark.rotation.y += dt * 29;
    const pulse = 0.75 + Math.abs(Math.sin(performance.now() * 0.03)) * 0.55;
    spark.scale.set(pulse, pulse, pulse);
  }
}
