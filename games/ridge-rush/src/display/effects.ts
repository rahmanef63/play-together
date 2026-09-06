import * as THREE from "three";
import { courseSurface } from "../shared/course.js";
import type { RiderPose, RidgeViewState } from "./model.js";

interface Particle {
  mesh: THREE.Mesh;
  life: number;
  vx: number;
  vy: number;
  vz: number;
}
export class RidgeEffects {
  readonly #particles: Particle[] = [];
  #cursor = 0;
  #accumulator = 0;
  constructor(private readonly scene: THREE.Scene) {
    const geometry = new THREE.SphereGeometry(0.12, 5, 4);
    for (let i = 0; i < 42; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xc4a484,
        transparent: true,
        opacity: 0,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      scene.add(mesh);
      this.#particles.push({ mesh, life: 0, vx: 0, vy: 0, vz: 0 });
    }
  }
  update(state: RidgeViewState, poses: Map<string, RiderPose>, dt: number) {
    this.#accumulator += dt;
    for (const rider of state.riders) {
      const pose = poses.get(rider.id);
      if (!pose || !rider.grounded || rider.speed < 9 || this.#accumulator < 0.028) continue;
      this.#spawn(pose, rider.progress, rider.speed);
    }
    if (this.#accumulator >= 0.028) this.#accumulator = 0;
    for (const particle of this.#particles) {
      if (particle.life <= 0) continue;
      particle.life -= dt;
      particle.mesh.position.x += particle.vx * dt;
      particle.mesh.position.y += particle.vy * dt;
      particle.mesh.position.z += particle.vz * dt;
      particle.vy += 1.6 * dt;
      const t = Math.max(0, particle.life / 0.65);
      particle.mesh.scale.setScalar(0.5 + (1 - t) * 2.2);
      const material = particle.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = t * 0.32;
      if (particle.life <= 0) particle.mesh.visible = false;
    }
  }
  dispose() {
    for (const particle of this.#particles) {
      this.scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      (particle.mesh.material as THREE.Material).dispose();
    }
  }
  #spawn(pose: RiderPose, progress: number, speed: number) {
    const particle = this.#particles[this.#cursor++ % this.#particles.length];
    if (!particle) return;
    const surface = courseSurface(progress);
    const material = particle.mesh.material as THREE.MeshBasicMaterial;
    material.color.setHex(surface === "snow" ? 0xe8f1f1 : surface === "rock" ? 0x9b9188 : 0xb98a62);
    particle.mesh.visible = true;
    particle.mesh.position.set(pose.x + (Math.random() - 0.5) * 0.45, pose.y + 0.12, pose.z - 0.72);
    particle.life = 0.45 + Math.min(0.2, speed * 0.003);
    particle.vx = (Math.random() - 0.5) * 0.9;
    particle.vy = 0.25 + Math.random() * 0.6;
    particle.vz = -1.5 - Math.min(3.5, speed * 0.05);
  }
}
