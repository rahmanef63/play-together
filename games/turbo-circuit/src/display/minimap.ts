import { circuitById, sampleCircuit } from "../shared/catalog.js";

const NS = "http://www.w3.org/2000/svg";
export function drawMinimapTrack(svg: SVGSVGElement, circuitId: string) {
  const circuit = circuitById(circuitId);
  const points = sampleCircuit(circuit, 96);
  const path = document.createElementNS(NS, "path");
  path.setAttribute(
    "d",
    `${points
      .map(
        (point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.z.toFixed(1)}`,
      )
      .join(" ")} Z`,
  );
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "rgba(255,255,255,.22)");
  path.setAttribute("stroke-width", String(circuit.width + 4));
  path.setAttribute("stroke-linejoin", "round");
  const center = path.cloneNode() as SVGPathElement;
  center.setAttribute("stroke", `#${circuit.palette.accent.toString(16).padStart(6, "0")}`);
  center.setAttribute("stroke-width", "2.5");
  center.setAttribute("stroke-dasharray", "3 3");
  svg.replaceChildren(path, center);
}
