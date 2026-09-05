import type { Metric, TelemetryMap } from "./types";

export function renderMetrics(root: HTMLElement, metrics: Metric[]) {
  if (!metrics.length) {
    const empty = document.createElement("span");
    empty.className = "console-telemetry__empty";
    empty.textContent = "Live status will appear here";
    root.replaceChildren(empty);
    return;
  }
  root.replaceChildren(
    ...metrics.map((metric, index) => {
      const item = document.createElement("div");
      item.className = `console-telemetry__metric${index === 0 ? " console-telemetry__metric--primary" : ""}`;
      const label = document.createElement("span");
      label.textContent = metric.label;
      const value = document.createElement("strong");
      value.textContent = metric.value;
      item.append(label, value);
      return item;
    }),
  );
}

export function renderMap(root: HTMLElement, map: TelemetryMap | undefined) {
  if (!map || (!map.route.length && !map.actors.length)) {
    root.replaceChildren();
    root.hidden = true;
    return;
  }
  root.hidden = false;
  const all = [...map.route, ...map.actors];
  const xs = all.map((point) => point.x);
  const zs = all.map((point) => point.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const spanX = Math.max(1, maxX - minX);
  const spanZ = Math.max(1, maxZ - minZ);
  const project = (point: { x: number; z: number }) => ({
    x: 8 + ((point.x - minX) / spanX) * 104,
    y: 72 - ((point.z - minZ) / spanZ) * 64,
  });
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 120 80");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Live map");
  if (map.route.length > 1) {
    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute(
      "points",
      map.route
        .map((point) => {
          const projected = project(point);
          return `${projected.x.toFixed(1)},${projected.y.toFixed(1)}`;
        })
        .join(" "),
    );
    polyline.setAttribute("class", "console-telemetry__route");
    svg.append(polyline);
  }
  for (const actor of map.actors) {
    const projected = project(actor);
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    marker.setAttribute("cx", projected.x.toFixed(1));
    marker.setAttribute("cy", projected.y.toFixed(1));
    marker.setAttribute("r", actor.own ? "4" : "2.5");
    marker.setAttribute(
      "class",
      actor.own
        ? "console-telemetry__actor console-telemetry__actor--own"
        : "console-telemetry__actor",
    );
    svg.append(marker);
  }
  root.replaceChildren(svg);
}
