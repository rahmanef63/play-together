import { trackById } from "../shared/catalog.js";
import { sampleTrack } from "../shared/trackMath.js";

const NS = "http://www.w3.org/2000/svg";
export function drawMinimapTrack(svg: SVGSVGElement, trackId: string) {
  const track = trackById(trackId),
    points = sampleTrack(track, 96),
    xs = points.map((p) => p.x),
    zs = points.map((p) => p.z);
  const minX = Math.min(...xs) - 12,
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
  svg.replaceChildren(path, center);
}
