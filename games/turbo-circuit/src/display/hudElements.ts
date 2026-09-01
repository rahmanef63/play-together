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
