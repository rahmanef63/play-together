import type { BrowserGameContext } from "@play-together/game-sdk";
import * as THREE from "three";
import {
  CAR_VIEWS,
  type CarViewName,
  type CarVisual,
  carMesh,
  carViewForCamera,
  parseCarAtlas,
} from "./carAtlas.js";
import { smoothAngle, smoothing } from "./math.js";
import type { Racer, RacerPose } from "./model.js";

const COLORS = [0xef4444, 0x3b82f6, 0xf59e0b, 0x39787a, 0x22c55e, 0x06b6d4, 0xf97316];

export class VehicleRenderer {
  readonly #scene: THREE.Scene;
  readonly #mapSvg: SVGSVGElement;
  readonly #mapDots: Map<string, SVGCircleElement>;
  readonly #cars = new Map<string, CarVisual>();
  readonly #poses = new Map<string, RacerPose>();
  readonly #textures = new Map<CarViewName, THREE.Texture>();
  #baseTexture: THREE.Texture | null = null;
  #atlasReady = false;

  constructor(
    scene: THREE.Scene,
    mapSvg: SVGSVGElement,
    mapDots: Map<string, SVGCircleElement>,
    host: HTMLElement,
    ctx: BrowserGameContext,
  ) {
    this.#scene = scene;
    this.#mapSvg = mapSvg;
    this.#mapDots = mapDots;
    host.dataset.assetState = "loading";
    void Promise.all([ctx.loadAsset("vehicle.red.atlas"), ctx.loadAsset("vehicle.red.frames")])
      .then(async ([imageBlob, metadataBlob]) => this.#loadAtlas(imageBlob, metadataBlob, host))
      .catch(() => {
        host.dataset.assetState = "fallback";
      });
  }

  sync(racers: Racer[]) {
    for (const [i, racer] of racers.entries()) {
      let visual = this.#cars.get(racer.id);
      if (visual) continue;
      visual = this.#createVisual(
        racer.bot ? 0xd1d5db : (COLORS[i % COLORS.length] ?? 0xffffff),
        racer.bot,
      );
      this.#cars.set(racer.id, visual);
      this.#poses.set(racer.id, { x: racer.x, z: racer.z, heading: racer.heading });
      this.#scene.add(visual.root);
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("r", racer.bot ? "1.8" : "2.7");
      dot.setAttribute("fill", racer.bot ? "#d1d5db" : `hsl(${(i * 67) % 360} 82% 62%)`);
      dot.setAttribute("stroke", "rgba(0,0,0,.55)");
      dot.setAttribute("stroke-width", ".8");
      this.#mapSvg.append(dot);
      this.#mapDots.set(racer.id, dot);
    }
    for (const [id, visual] of this.#cars)
      if (!racers.some((racer) => racer.id === id)) {
        this.#scene.remove(visual.root);
        this.#cars.delete(id);
        this.#poses.delete(id);
        this.#mapDots.get(id)?.remove();
        this.#mapDots.delete(id);
      }
  }

  update(racers: Racer[], camera: THREE.PerspectiveCamera, dt: number) {
    const alpha = smoothing(14, dt);
    for (const racer of racers) {
      const visual = this.#cars.get(racer.id);
      const pose = this.#poses.get(racer.id);
      if (!visual || !pose) continue;
      const teleported = Math.hypot(racer.x - pose.x, racer.z - pose.z) > 30;
      pose.x = teleported ? racer.x : THREE.MathUtils.lerp(pose.x, racer.x, alpha);
      pose.z = teleported ? racer.z : THREE.MathUtils.lerp(pose.z, racer.z, alpha);
      pose.heading = teleported ? racer.heading : smoothAngle(pose.heading, racer.heading, alpha);
      visual.root.position.set(pose.x, 0, pose.z);
      visual.fallback.rotation.y = pose.heading;
      if (this.#atlasReady) {
        const nextView = carViewForCamera(camera.position, pose);
        if (nextView !== visual.view) {
          visual.view = nextView;
          visual.material.map = this.#textures.get(nextView) ?? this.#textures.get("rear") ?? null;
          visual.material.needsUpdate = true;
        }
      }
      const dot = this.#mapDots.get(racer.id);
      if (dot) {
        dot.setAttribute("cx", pose.x.toFixed(2));
        dot.setAttribute("cy", pose.z.toFixed(2));
      }
    }
  }

  pose(id: string): RacerPose | undefined {
    return this.#poses.get(id);
  }
  dispose() {
    for (const texture of this.#textures.values()) texture.dispose();
    this.#baseTexture?.dispose();
  }

  #createVisual(color: number, bot: boolean): CarVisual {
    const root = new THREE.Group();
    const fallback = carMesh(color);
    const material = new THREE.SpriteMaterial({
      transparent: true,
      alphaTest: 0.03,
      depthWrite: false,
      color: bot ? 0xd6d9d7 : 0xffffff,
    });
    const sprite = new THREE.Sprite(material);
    sprite.center.set(0.5, 0.18);
    sprite.scale.set(5.2, 3.9, 1);
    sprite.visible = this.#atlasReady;
    fallback.visible = !this.#atlasReady;
    root.add(fallback, sprite);
    return { root, fallback, sprite, material, view: "rear" };
  }

  async #loadAtlas(imageBlob: Blob, metadataBlob: Blob, host: HTMLElement) {
    const metadata = parseCarAtlas(JSON.parse(await metadataBlob.text()));
    const objectUrl = URL.createObjectURL(imageBlob);
    try {
      const base = await new THREE.TextureLoader().loadAsync(objectUrl);
      base.colorSpace = THREE.SRGBColorSpace;
      base.magFilter = THREE.LinearFilter;
      base.minFilter = THREE.LinearFilter;
      this.#baseTexture = base;
      const imageWidth = (base.image as { width: number }).width;
      const imageHeight = (base.image as { height: number }).height;
      for (const name of CAR_VIEWS) {
        const frame = metadata.frames[name];
        const texture = base.clone();
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.repeat.set(frame.width / imageWidth, frame.height / imageHeight);
        texture.offset.set(frame.x / imageWidth, 1 - (frame.y + frame.height) / imageHeight);
        texture.needsUpdate = true;
        this.#textures.set(name, texture);
      }
      this.#atlasReady = true;
      host.dataset.assetState = "ready";
      for (const visual of this.#cars.values()) {
        visual.fallback.visible = false;
        visual.sprite.visible = true;
        visual.material.map = this.#textures.get(visual.view) ?? this.#textures.get("rear") ?? null;
        visual.material.needsUpdate = true;
      }
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }
}
