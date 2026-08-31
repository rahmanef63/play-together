export interface TurboHud {
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  top: HTMLElement;
  nitro: HTMLElement;
  speedValue: HTMLElement;
  speedNeedle: HTMLElement;
  cameraBadge: HTMLElement;
  setup: HTMLElement;
  setupCircuit: HTMLElement;
  setupCar: HTMLElement;
  setupTrait: HTMLElement;
  setupStats: HTMLElement;
  setupReady: HTMLElement;
  setupHelp: HTMLElement;
  mapSvg: SVGSVGElement;
  mapDots: Map<string, SVGCircleElement>;
  results: HTMLElement;
  resultsBody: HTMLElement;
  wrongWay: HTMLElement;
}

export function createTurboHud(root: HTMLElement): TurboHud {
  const host = document.createElement("section");
  host.className = "turbo-circuit";
  host.style.cssText =
    "position:relative;width:100%;height:100%;min-height:320px;overflow:hidden;background:#111";
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "display:block;width:100%;height:100%";
  const top = layer("left:14px;top:14px;font:900 clamp(12px,2vw,18px)/1.2 system-ui");
  top.className = "turbo-race-status";
  const cameraBadge = layer(
    "left:50%;top:14px;transform:translateX(-50%);padding:6px 10px;border:1px solid #ffffff33;background:#101318bb;font:800 11px/1 system-ui;letter-spacing:.08em",
  );
  cameraBadge.className = "turbo-camera";
  const wrongWay = layer(
    "left:50%;top:16%;transform:translateX(-50%);padding:8px 14px;background:#a9142ddd;font:900 15px/1 system-ui;letter-spacing:.1em;opacity:0;transition:opacity .12s",
  );
  wrongWay.className = "turbo-wrong-way";
  wrongWay.textContent = "WRONG WAY";

  const speed = document.createElement("div");
  speed.className = "turbo-speedometer";
  speed.style.cssText =
    "position:absolute;left:12px;bottom:12px;width:clamp(108px,18vw,152px);aspect-ratio:1;border-radius:50%;background:#0b0d10dd;border:3px solid #e9e3d4;box-shadow:0 4px 18px #0008;pointer-events:none";
  const speedNeedle = document.createElement("span");
  speedNeedle.style.cssText =
    "position:absolute;left:49%;top:21%;width:3px;height:38%;background:#e2473f;transform-origin:50% 78%;transform:rotate(-125deg);border-radius:3px";
  const speedValue = document.createElement("strong");
  speedValue.className = "turbo-speedometer__value";
  speedValue.style.cssText =
    "position:absolute;left:50%;bottom:20%;transform:translateX(-50%);font:900 clamp(20px,4vw,32px)/1 system-ui;color:white;white-space:nowrap";
  const kmh = document.createElement("small");
  kmh.textContent = "KM/H";
  kmh.style.cssText =
    "position:absolute;left:50%;bottom:9%;transform:translateX(-50%);font:800 9px/1 system-ui;color:#d7d1c4";
  speed.append(speedNeedle, speedValue, kmh);

  const nitro = layer(
    "right:12px;bottom:16px;min-width:116px;padding:8px 10px;background:#0b0d10dd;border:2px solid #e9e3d4;font:900 12px/1 system-ui;text-align:center",
  );
  nitro.className = "turbo-nitro";
  const minimap = document.createElement("div");
  minimap.className = "turbo-minimap";
  minimap.style.cssText =
    "position:absolute;right:12px;top:52px;width:clamp(120px,18vw,176px);aspect-ratio:1.45;background:#080b10b8;border:1px solid #ffffff2b;padding:6px;pointer-events:none";
  const mapSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  mapSvg.setAttribute("viewBox", "-96 -66 192 132");
  mapSvg.setAttribute("width", "100%");
  mapSvg.setAttribute("height", "100%");
  minimap.append(mapSvg);

  const setup = document.createElement("section");
  setup.className = "turbo-setup";
  setup.style.cssText =
    "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(86%,520px);padding:18px;background:#11151aee;border:3px solid #e8dfc8;box-shadow:8px 8px 0 #0008;color:#f5f0e5;font-family:system-ui;pointer-events:none";
  const setupTitle = document.createElement("h2");
  setupTitle.textContent = "TURBO CIRCUIT · GARAGE";
  setupTitle.style.cssText =
    "margin:0 0 14px;font:900 clamp(20px,4vw,34px)/1 system-ui;letter-spacing:.04em";
  const setupCircuit = setupLine("CIRCUIT");
  const setupCar = setupLine("CAR");
  const setupTrait = setupLine("CLASS");
  const setupStats = setupLine("STATS");
  const setupReady = setupLine("STATUS");
  const setupHelp = document.createElement("p");
  setupHelp.style.cssText =
    "margin:14px 0 0;color:#cfc8b7;font:800 11px/1.5 system-ui;letter-spacing:.04em";
  setup.append(
    setupTitle,
    setupCircuit.row,
    setupCar.row,
    setupTrait.row,
    setupReady.row,
    setupHelp,
  );
  const results = document.createElement("section");
  results.className = "turbo-results";
  results.style.cssText =
    "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(84%,440px);padding:18px;background:#10141aee;border:3px solid #e8dfc8;color:#f5f0e5;font-family:system-ui;display:none;pointer-events:none";
  const resultsTitle = document.createElement("h2");
  resultsTitle.textContent = "RACE COMPLETE";
  resultsTitle.style.cssText = "margin:0 0 12px;font:900 clamp(21px,4vw,32px)/1 system-ui";
  const resultsBody = document.createElement("div");
  resultsBody.style.cssText = "white-space:pre-line;font:800 13px/1.65 system-ui";
  const resultsHelp = document.createElement("p");
  resultsHelp.textContent = "ROOM → MENU TO RACE AGAIN";
  resultsHelp.style.cssText = "margin:12px 0 0;color:#aeb6be;font:800 10px/1.4 system-ui";
  results.append(resultsTitle, resultsBody, resultsHelp);
  host.append(canvas, top, cameraBadge, wrongWay, speed, nitro, minimap, setup, results);
  root.append(host);
  return {
    host,
    canvas,
    top,
    nitro,
    speedValue,
    speedNeedle,
    cameraBadge,
    setup,
    setupCircuit: setupCircuit.value,
    setupCar: setupCar.value,
    setupTrait: setupTrait.value,
    setupStats: setupStats.value,
    setupReady: setupReady.value,
    setupHelp,
    mapSvg,
    mapDots: new Map(),
    results,
    resultsBody,
    wrongWay,
  };
}

function layer(css: string) {
  const element = document.createElement("div");
  element.style.cssText = `position:absolute;pointer-events:none;color:white;text-shadow:0 2px 4px #000;${css}`;
  return element;
}
function setupLine(label: string) {
  const row = document.createElement("div");
  row.style.cssText =
    "display:grid;grid-template-columns:92px 1fr;gap:10px;padding:7px 0;border-top:1px solid #ffffff20";
  const key = document.createElement("span");
  key.textContent = label;
  key.style.cssText = "font:800 11px/1.2 system-ui;color:#9ba4ad";
  const value = document.createElement("strong");
  value.style.cssText = "font:900 14px/1.2 system-ui";
  row.append(key, value);
  return { row, value };
}
