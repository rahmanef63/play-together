import { COCKPIT_CSS, type CockpitHud, createCockpitHud } from "./cockpitHud.js";
import { cardKicker, createTrackSvg, layer, soundButton, speedometer } from "./hudElements.js";
import { TURBO_HUD_CSS } from "./hudStyles.js";

export interface TurboHud {
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  top: HTMLElement;
  nitro: HTMLElement;
  speed: HTMLElement;
  speedValue: HTMLElement;
  speedNeedle: HTMLElement;
  cameraBadge: HTMLElement;
  minimap: HTMLElement;
  setup: HTMLElement;
  setupCircuit: HTMLElement;
  setupCircuitMeta: HTMLElement;
  setupMapSvg: SVGSVGElement;
  setupCar: HTMLElement;
  setupCarPreview: HTMLElement;
  setupTrait: HTMLElement;
  setupStats: HTMLElement;
  setupMode: HTMLElement;
  setupReady: HTMLElement;
  setupRoster: HTMLElement;
  setupCta: HTMLElement;
  setupHelp: HTMLElement;
  mapSvg: SVGSVGElement;
  mapDots: Map<string, SVGCircleElement>;
  results: HTMLElement;
  resultsBody: HTMLElement;
  wrongWay: HTMLElement;
  pause: HTMLElement;
  sound: HTMLButtonElement;
  cockpit: CockpitHud;
}

export function createTurboHud(root: HTMLElement): TurboHud {
  const host = document.createElement("section");
  host.className = "turbo-circuit";
  const style = document.createElement("style");
  style.textContent = `${TURBO_HUD_CSS}
${COCKPIT_CSS}`;

  const canvas = document.createElement("canvas");
  canvas.className = "turbo-circuit__canvas";

  const top = layer("turbo-race-status");
  const cameraBadge = layer("turbo-camera");
  const wrongWay = layer("turbo-wrong-way");
  wrongWay.textContent = "WRONG WAY";
  const pause = layer("turbo-pause");
  pause.textContent = "PAUSED";
  const sound = soundButton();
  const cockpit = createCockpitHud();

  const { speed, speedNeedle, speedValue } = speedometer();

  const nitro = layer("turbo-nitro");
  const minimap = document.createElement("div");
  minimap.className = "turbo-minimap";
  const mapSvg = createTrackSvg();
  minimap.append(mapSvg);

  const setup = document.createElement("section");
  setup.className = "turbo-setup";
  const setupPanel = document.createElement("div");
  setupPanel.className = "turbo-setup__panel";

  const setupHeader = document.createElement("header");
  setupHeader.className = "turbo-setup__header";
  const setupHeadingCopy = document.createElement("div");
  const setupEyebrow = document.createElement("span");
  setupEyebrow.className = "turbo-setup__eyebrow";
  setupEyebrow.textContent = "PLAY TOGETHER / TURBO CIRCUIT";
  const setupTitle = document.createElement("h2");
  setupTitle.textContent = "SELECT & READY";
  setupHeadingCopy.append(setupEyebrow, setupTitle);
  const setupVersion = document.createElement("span");
  setupVersion.className = "turbo-setup__version";
  setupVersion.textContent = "KART TOUR";
  setupHeader.append(setupHeadingCopy, setupVersion);

  const setupGrid = document.createElement("div");
  setupGrid.className = "turbo-setup__grid";

  const circuitCard = document.createElement("article");
  circuitCard.className = "turbo-setup__card turbo-setup__card--circuit";
  const circuitKicker = cardKicker("CIRCUIT", "P1 SELECTS");
  const setupCircuit = document.createElement("strong");
  setupCircuit.className = "turbo-setup__name";
  const setupCircuitMeta = document.createElement("p");
  setupCircuitMeta.className = "turbo-setup__meta";
  const setupMap = document.createElement("div");
  setupMap.className = "turbo-setup__map";
  const setupMapSvg = createTrackSvg();
  setupMap.append(setupMapSvg);
  circuitCard.append(circuitKicker, setupCircuit, setupCircuitMeta, setupMap);

  const carCard = document.createElement("article");
  carCard.className = "turbo-setup__card turbo-setup__card--car";
  const carKicker = cardKicker("CAR", "YOUR PICK");
  const setupCar = document.createElement("strong");
  setupCar.className = "turbo-setup__name";
  const setupCarPreview = document.createElement("div");
  setupCarPreview.className = "turbo-setup__car-preview";
  setupCarPreview.setAttribute("aria-hidden", "true");
  const setupTrait = document.createElement("p");
  setupTrait.className = "turbo-setup__meta";
  const setupStats = document.createElement("p");
  setupStats.className = "turbo-setup__stats";
  carCard.append(carKicker, setupCar, setupCarPreview, setupTrait, setupStats);

  setupGrid.append(circuitCard, carCard);

  const setupFooter = document.createElement("div");
  setupFooter.className = "turbo-setup__footer";
  const setupInfo = document.createElement("div");
  setupInfo.className = "turbo-setup__info";
  const setupMode = document.createElement("strong");
  setupMode.className = "turbo-setup__mode";
  const setupReady = document.createElement("span");
  setupReady.className = "turbo-setup__ready";
  const setupRoster = document.createElement("span");
  setupRoster.className = "turbo-setup__roster";
  setupInfo.append(setupMode, setupReady, setupRoster);
  const setupCta = document.createElement("strong");
  setupCta.className = "turbo-setup__cta";
  setupFooter.append(setupInfo, setupCta);

  const setupHelp = document.createElement("p");
  setupHelp.className = "turbo-setup__help";

  setupPanel.append(setupHeader, setupGrid, setupFooter, setupHelp);
  setup.append(setupPanel);

  const results = document.createElement("section");
  results.className = "turbo-results";
  const resultsTitle = document.createElement("h2");
  resultsTitle.textContent = "RACE COMPLETE";
  const resultsBody = document.createElement("div");
  resultsBody.className = "turbo-results__body";
  const resultsHelp = document.createElement("p");
  resultsHelp.textContent = "START = READY FOR REMATCH · ROOM = EXIT";
  results.append(resultsTitle, resultsBody, resultsHelp);

  host.append(
    style,
    canvas,
    cockpit.root,
    top,
    cameraBadge,
    wrongWay,
    pause,
    sound,
    speed,
    nitro,
    minimap,
    setup,
    results,
  );
  root.append(host);

  return {
    host,
    canvas,
    top,
    nitro,
    speed,
    speedValue,
    speedNeedle,
    cameraBadge,
    minimap,
    setup,
    setupCircuit,
    setupCircuitMeta,
    setupMapSvg,
    setupCar,
    setupCarPreview,
    setupTrait,
    setupStats,
    setupMode,
    setupReady,
    setupRoster,
    setupCta,
    setupHelp,
    mapSvg,
    mapDots: new Map(),
    results,
    resultsBody,
    wrongWay,
    pause,
    sound,
    cockpit,
  };
}
