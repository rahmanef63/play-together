import type { TrackSpec } from "./catalog.js";
import { featurePoses } from "./trackMath.js";

export const BOOST_PAD = { width: 7.8, length: 4.8, duration: 1.35 } as const;
type FeaturePose = ReturnType<typeof featurePoses>[number];
const boostCache = new WeakMap<TrackSpec, FeaturePose[]>();
export function boostPadsFor(track: TrackSpec) {
  let pads = boostCache.get(track);
  if (!pads) {
    pads = featurePoses(track, track.features.boostPads, [0]);
    boostCache.set(track, pads);
  }
  return pads;
}
export function onBoostPad(pad: FeaturePose, point: { x: number; z: number }) {
  const dx = point.x - pad.x,
    dz = point.z - pad.z;
  const lateral = dx * Math.cos(pad.heading) - dz * Math.sin(pad.heading);
  const forward = dx * Math.sin(pad.heading) + dz * Math.cos(pad.heading);
  return Math.abs(lateral) <= BOOST_PAD.width / 2 && Math.abs(forward) <= BOOST_PAD.length / 2;
}
