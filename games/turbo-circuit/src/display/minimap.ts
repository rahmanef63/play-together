import { trackById } from "../shared/catalog.js";
import { featurePoses, sampleTrack } from "../shared/trackMath.js";

const NS = "http://www.w3.org/2000/svg";
export function drawMinimapTrack(svg: SVGSVGElement, trackId: string) {
  const track = trackById(trackId),
    points = sampleTrack(track, 96),
    xs = points.map((p) => p.x),
    zs = points.map((p) => p.z),
    minX = Math.min(...xs) - 12,
    maxX = Math.max(...xs) + 12,
    minZ = Math.min(...zs) - 12,
    maxZ = Math.max(...zs) + 12;
  svg.setAttribute(
    "viewBox",
    `${minX} ${minZ} ${Math.max(1, maxX - minX)} ${Math.max(1, maxZ - minZ)}`,
  );
  const path = document.createElementNS(NS, "path");
  path.setAttribute(
    "d",
    `${points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.z.toFixed(1)}`).join(" ")} Z`,
  );
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "rgba(255,255,255,.22)");
  path.setAttribute("stroke-width", String(track.width + 4));
  path.setAttribute("stroke-linejoin", "round");
  const center = path.cloneNode() as SVGPathElement;
  center.setAttribute("stroke", `#${track.palette.accent.toString(16).padStart(6, "0")}`);
  center.setAttribute("stroke-width", "2.5");
  center.setAttribute("stroke-dasharray", "3 3");
  const markers = document.createElementNS(NS, "g");
  markers.setAttribute("data-map-features", "true");
  for (const point of featurePoses(track, track.features.boostPads, [0]))
    markers.append(
      marker(point.x, point.z, 1.7, `#${track.palette.accent.toString(16).padStart(6, "0")}`),
    );
  for (const point of featurePoses(track, track.features.itemBoxes, [0]))
    markers.append(marker(point.x, point.z, 1.25, "#f7f3e8"));
  for (const point of featurePoses(track, track.features.coinRows, [0]))
    markers.append(marker(point.x, point.z, 0.85, "#f4c542"));
  svg.replaceChildren(path, center, markers);
}
function marker(x: number, z: number, radius: number, fill: string) {
  const circle = document.createElementNS(NS, "circle");
  circle.setAttribute("cx", x.toFixed(2));
  circle.setAttribute("cy", z.toFixed(2));
  circle.setAttribute("r", String(radius));
  circle.setAttribute("fill", fill);
  circle.setAttribute("stroke", "#080a0ccc");
  circle.setAttribute("stroke-width", ".7");
  return circle;
}
