export interface TurboHud {
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  top: HTMLElement;
  bottom: HTMLElement;
  mapSvg: SVGSVGElement;
  mapDots: Map<string, SVGCircleElement>;
  wrongWay: HTMLElement;
}
export function createTurboHud(root: HTMLElement): TurboHud {
  const host = document.createElement("section");
  host.style.cssText =
    "position:relative;width:100%;height:100%;min-height:320px;overflow:hidden;background:#86c5ff";
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "display:block;width:100%;height:100%";
  const hud = document.createElement("div");
  hud.style.cssText =
    "position:absolute;inset:0;pointer-events:none;color:white;font:800 14px/1.2 system-ui;text-shadow:0 2px 5px #000;display:flex;flex-direction:column;justify-content:space-between;padding:14px";
  const top = document.createElement("div");
  const bottom = document.createElement("div");
  bottom.style.cssText = "display:flex;gap:12px;align-items:end;justify-content:space-between";
  hud.append(top, bottom);
  const minimap = document.createElement("div");
  minimap.setAttribute("aria-label", "Track minimap");
  minimap.style.cssText =
    "position:absolute;right:12px;top:54px;width:clamp(118px,18vw,176px);aspect-ratio:1.55;border-radius:14px;background:rgba(7,11,15,.68);box-shadow:inset 0 0 0 1px rgba(255,255,255,.16);backdrop-filter:blur(8px);padding:7px;pointer-events:none";
  const mapSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  mapSvg.setAttribute("viewBox", "-82 -52 164 104");
  mapSvg.setAttribute("width", "100%");
  mapSvg.setAttribute("height", "100%");
  const outer = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
  outer.setAttribute("cx", "0");
  outer.setAttribute("cy", "0");
  outer.setAttribute("rx", "70");
  outer.setAttribute("ry", "46");
  outer.setAttribute("fill", "none");
  outer.setAttribute("stroke", "rgba(255,255,255,.26)");
  outer.setAttribute("stroke-width", "2");
  const track = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
  track.setAttribute("cx", "0");
  track.setAttribute("cy", "0");
  track.setAttribute("rx", "62");
  track.setAttribute("ry", "38");
  track.setAttribute("fill", "none");
  track.setAttribute("stroke", "#f6d44a");
  track.setAttribute("stroke-width", "4");
  track.setAttribute("stroke-dasharray", "4 4");
  mapSvg.append(outer, track);
  minimap.append(mapSvg);
  const wrongWay = document.createElement("div");
  wrongWay.style.cssText =
    "position:absolute;left:50%;top:17%;transform:translateX(-50%);padding:7px 12px;border-radius:999px;background:rgba(181,28,52,.82);font:900 clamp(11px,2vw,16px)/1 system-ui;color:white;letter-spacing:.08em;opacity:0;transition:opacity 120ms ease;pointer-events:none";
  wrongWay.textContent = "WRONG WAY";
  host.append(canvas, hud, minimap, wrongWay);
  root.append(host);
  return { host, canvas, top, bottom, mapSvg, mapDots: new Map(), wrongWay };
}
