const SVG_NS = "http://www.w3.org/2000/svg";

export function controllerBackdrop(): SVGSVGElement {
  const svg = rootSvg("0 0 1000 520", "console-controller-svg");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `
    <path class="console-controller-svg__shadow" d="M137 181C175 103 274 82 385 117H615C726 82 825 103 863 181C902 261 899 367 839 428C788 480 725 475 678 414L625 350H375L322 414C275 475 212 480 161 428C101 367 98 261 137 181Z"/>
    <path class="console-controller-svg__body" d="M149 169C188 99 280 86 387 122H613C720 86 812 99 851 169C891 241 884 346 830 405C788 451 742 449 705 400L645 322H355L295 400C258 449 212 451 170 405C116 346 109 241 149 169Z"/>
    <path class="console-controller-svg__panel" d="M381 121H619L647 304H353L381 121Z"/>
    <rect class="console-controller-svg__touch" x="430" y="148" width="140" height="70" rx="18"/>
    <circle class="console-controller-svg__led" cx="500" cy="255" r="7"/>
    <path class="console-controller-svg__grip" d="M181 317C185 374 220 411 265 421M819 317C815 374 780 411 735 421"/>
  `;
  return svg;
}

export function faceGraphic(glyph: string): SVGSVGElement {
  const svg = rootSvg("0 0 64 64", "console-face-svg");
  const outer = element("circle", {
    cx: "32",
    cy: "32",
    r: "29",
    class: "console-face-svg__outer",
  });
  const inner = element("circle", {
    cx: "32",
    cy: "32",
    r: "23",
    class: "console-face-svg__inner",
  });
  const text = element("text", {
    x: "32",
    y: "39",
    "text-anchor": "middle",
    class: "console-face-svg__glyph",
  });
  text.textContent = glyph;
  svg.append(outer, inner, text);
  return svg;
}

export function stickGraphic(): { svg: SVGSVGElement; knob: SVGGElement } {
  const svg = rootSvg("0 0 160 160", "console-stick-svg");
  svg.append(
    element("circle", { cx: "80", cy: "80", r: "75", class: "console-stick-svg__well" }),
    element("circle", { cx: "80", cy: "80", r: "58", class: "console-stick-svg__ring" }),
  );
  const knob = element("g", { class: "console-stick-svg__knob" }) as SVGGElement;
  knob.append(
    element("circle", { cx: "80", cy: "80", r: "39", class: "console-stick-svg__cap" }),
    element("circle", { cx: "80", cy: "80", r: "29", class: "console-stick-svg__texture" }),
  );
  svg.append(knob);
  return { svg, knob };
}

export function dpadBackdrop(): SVGSVGElement {
  const svg = rootSvg("0 0 150 150", "console-dpad-svg");
  svg.setAttribute("aria-hidden", "true");
  svg.append(
    element("path", {
      d: "M55 8H95V55H142V95H95V142H55V95H8V55H55Z",
      class: "console-dpad-svg__body",
    }),
    element("circle", { cx: "75", cy: "75", r: "15", class: "console-dpad-svg__center" }),
  );
  return svg;
}

export function directionGraphic(direction: "up" | "down" | "left" | "right"): SVGSVGElement {
  const rotations = { up: 0, right: 90, down: 180, left: 270 } as const;
  const svg = rootSvg("0 0 40 40", "console-direction-svg");
  const arrow = element("path", {
    d: "M20 8L31 24H9L20 8Z",
    class: "console-direction-svg__arrow",
    transform: `rotate(${rotations[direction]} 20 20)`,
  });
  svg.append(arrow);
  return svg;
}

export function touchGraphic(): { svg: SVGSVGElement; crosshair: SVGGElement } {
  const svg = rootSvg("0 0 400 220", "console-touch-svg");
  svg.setAttribute("preserveAspectRatio", "none");
  const grid = element("path", {
    d: "M50 0V220M100 0V220M150 0V220M200 0V220M250 0V220M300 0V220M350 0V220M0 44H400M0 88H400M0 132H400M0 176H400",
    class: "console-touch-svg__grid",
  });
  const crosshair = element("g", { class: "console-touch-svg__crosshair" }) as SVGGElement;
  crosshair.append(
    element("circle", { cx: "200", cy: "110", r: "15" }),
    element("path", { d: "M200 85V95M200 125V135M175 110H185M215 110H225" }),
  );
  svg.append(grid, crosshair);
  return { svg, crosshair };
}

function rootSvg(viewBox: string, className: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("class", className);
  svg.setAttribute("focusable", "false");
  return svg;
}

function element(tag: string, attributes: Record<string, string>): SVGElement {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  return node;
}
