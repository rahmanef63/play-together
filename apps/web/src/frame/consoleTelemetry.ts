import type { GameManifest, SnapshotMessage } from "@play-together/contracts";
import type { BrowserGameContext } from "@play-together/game-sdk";
import { renderMap, renderMetrics } from "./telemetry/render";
import { summarizeConsoleTelemetry } from "./telemetry/summarize";

export function mountConsoleTelemetry(
  root: HTMLElement,
  manifest: GameManifest,
  context: BrowserGameContext,
): () => void {
  root.replaceChildren();

  const header = document.createElement("header");
  header.className = "console-telemetry__header";
  const copy = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = manifest.game.title;
  const phase = document.createElement("span");
  phase.textContent = "WAITING";
  copy.append(title, phase);
  const detail = document.createElement("small");
  detail.textContent = "Waiting for game status";
  header.append(copy, detail);

  const body = document.createElement("div");
  body.className = "console-telemetry__body";
  const map = document.createElement("div");
  map.className = "console-telemetry__map";
  map.setAttribute("aria-label", "Game map or radar");
  const metrics = document.createElement("div");
  metrics.className = "console-telemetry__metrics";
  body.append(map, metrics);
  root.append(header, body);

  let latest: SnapshotMessage | null = null;
  let frame = 0;
  const render = () => {
    frame = 0;
    if (!latest) return;
    const summary = summarizeConsoleTelemetry(latest, context.playerId);
    phase.textContent = summary.phase;
    detail.textContent = summary.detail;
    renderMetrics(metrics, summary.metrics);
    renderMap(map, summary.map);
  };
  const unsubscribe = context.subscribe((snapshot) => {
    latest = snapshot;
    if (!frame) frame = requestAnimationFrame(render);
  });

  return () => {
    unsubscribe();
    if (frame) cancelAnimationFrame(frame);
    root.replaceChildren();
  };
}
