import type * as THREE from "three";
import type { RiderView } from "./model.js";

export function animateRider(
  root: THREE.Group,
  rider: RiderView,
  frontCompression: number,
  rearCompression: number,
  dt: number,
): void {
  const front = root.getObjectByName("front-wheel");
  const rear = root.getObjectByName("rear-wheel");
  const frame = root.getObjectByName("bike-frame");
  if (front) {
    front.rotation.z -= (rider.speed * dt) / 0.42;
    front.position.y = 0.43 + frontCompression * 0.11;
  }
  if (rear) {
    rear.rotation.z -= (rider.speed * dt) / 0.42;
    rear.position.y = 0.43 + rearCompression * 0.1;
  }
  if (!frame) return;
  frame.position.y = (frontCompression + rearCompression) * 0.025;
  frame.rotation.set(0, 0, rider.powerslide ? -rider.lean * 0.18 : 0);
  applyAirStyle(frame, rider);
  const phase = performance.now() * 0.004 + rider.speed * 0.07;
  const pedal = Math.sin(phase) * Math.min(0.65, 0.18 + rider.speed * 0.012);
  frame.getObjectByName("crank")?.rotateX(rider.speed * dt * 0.75);
  const leftLeg = frame.getObjectByName("left-leg");
  const rightLeg = frame.getObjectByName("right-leg");
  const leftArm = frame.getObjectByName("left-arm");
  const rightArm = frame.getObjectByName("right-arm");
  const body = frame.getObjectByName("rider-body");
  if (leftLeg) leftLeg.rotation.x = 0.3 + pedal;
  if (rightLeg) rightLeg.rotation.x = 0.3 - pedal;
  const armFlex = 0.88 + (frontCompression - rearCompression) * 0.8;
  if (leftArm) {
    leftArm.rotation.x = armFlex;
    leftArm.rotation.z = rider.currentTrick === "TABLE STYLE" ? -0.85 : -0.2;
  }
  if (rightArm) {
    rightArm.rotation.x = armFlex;
    rightArm.rotation.z = rider.currentTrick === "TABLE STYLE" ? 0.85 : 0.2;
  }
  if (body) body.rotation.x = (frontCompression - rearCompression) * 0.08;
}

function applyAirStyle(frame: THREE.Object3D, rider: RiderView): void {
  if (!rider.currentTrick || rider.grounded) return;
  const phase = Math.min(1, rider.airTimeMs / 720) * Math.PI * 2;
  if (rider.currentTrick === "FRONT ARC") frame.rotation.x = -phase;
  else if (rider.currentTrick === "BACK ARC") frame.rotation.x = phase;
  else if (rider.currentTrick === "LEFT SPIN") frame.rotation.y = phase;
  else if (rider.currentTrick === "RIGHT SPIN") frame.rotation.y = -phase;
  else frame.rotation.z += Math.sin(phase) * 0.55;
}
