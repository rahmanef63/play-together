export function layer(className: string) {
  const element = document.createElement("div");
  element.className = className;
  return element;
}

export function createTrackSvg() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "-92 -92 184 184");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("aria-hidden", "true");
  return svg;
}

export function cardKicker(label: string, hint: string) {
  const row = document.createElement("div");
  row.className = "turbo-setup__kicker";
  const key = document.createElement("span");
  key.textContent = label;
  const value = document.createElement("small");
  value.textContent = hint;
  row.append(key, value);
  return row;
}

export function soundButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "turbo-sound";
  button.setAttribute("aria-label", "Toggle race sound");
  return button;
}

export function speedometer() {
  const speed = document.createElement("div");
  speed.className = "turbo-speedometer";
  const speedNeedle = document.createElement("span");
  speedNeedle.className = "turbo-speedometer__needle";
  const speedValue = document.createElement("strong");
  speedValue.className = "turbo-speedometer__value";
  const kmh = document.createElement("small");
  kmh.textContent = "KM/H";
  speed.append(speedNeedle, speedValue, kmh);
  return { speed, speedNeedle, speedValue };
}
