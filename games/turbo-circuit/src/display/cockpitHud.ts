const NS = "http://www.w3.org/2000/svg";
let cockpitSequence = 0;

export interface CockpitHud {
  root: HTMLElement;
  wheel: SVGGElement;
  mirrorScene: SVGGElement;
  speed: SVGTextElement;
}

export function createCockpitHud(): CockpitHud {
  const root = document.createElement("div");
  root.className = "turbo-cockpit";
  root.setAttribute("aria-hidden", "true");
  const svg = document.createElementNS(NS, "svg");
  const id = `turbo-cockpit-${++cockpitSequence}`;
  svg.setAttribute("viewBox", "0 0 1000 560");
  svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
  svg.innerHTML = `
    <defs>
      <linearGradient id="${id}-dash" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#272b30"/><stop offset="1" stop-color="#08090b"/></linearGradient>
      <linearGradient id="${id}-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9d9ef" stop-opacity=".32"/><stop offset="1" stop-color="#dff4ff" stop-opacity=".04"/></linearGradient>
      <clipPath id="${id}-mirror-clip"><rect x="390" y="34" width="220" height="70" rx="13"/></clipPath>
    </defs>
    <path d="M0 0H1000V560H0Z" fill="none"/>
    <path d="M0 0L122 0L245 375L0 522Z" fill="#0b0c0f" opacity=".96"/>
    <path d="M1000 0L878 0L755 375L1000 522Z" fill="#0b0c0f" opacity=".96"/>
    <path d="M117 0L246 376H754L883 0" fill="url(#${id}-glass)" opacity=".45"/>
    <rect x="378" y="26" width="244" height="88" rx="17" fill="#08090b" stroke="#777" stroke-width="5"/>
    <g data-part="mirror-scene" clip-path="url(#${id}-mirror-clip)">
      <rect x="355" y="34" width="290" height="70" fill="#8bbdd3"/>
      <path d="M355 77H645V104H355Z" fill="#3e603a"/>
      <path d="M468 104L492 66H508L532 104Z" fill="#3c3d40"/>
      <path d="M496 98L499 70H501L504 98Z" fill="#efefdf"/>
    </g>
    <path d="M0 425Q170 350 342 392Q500 430 658 392Q830 350 1000 425V560H0Z" fill="url(#${id}-dash)"/>
    <path d="M265 420Q500 350 735 420L690 560H310Z" fill="#121418" stroke="#34383f" stroke-width="4"/>
    <rect x="446" y="399" width="108" height="52" rx="10" fill="#050607" stroke="#5f6770" stroke-width="3"/>
    <text data-part="speed" x="500" y="433" fill="#e9f8ff" font-size="26" text-anchor="middle" font-family="ui-monospace,monospace" font-weight="800">0 KM/H</text>
    <g data-part="wheel">
      <circle cx="500" cy="492" r="96" fill="none" stroke="#111317" stroke-width="28"/>
      <circle cx="500" cy="492" r="94" fill="none" stroke="#555a61" stroke-width="3"/>
      <path d="M500 492L432 445M500 492L568 445M500 492V566" stroke="#17191d" stroke-width="22" stroke-linecap="round"/>
      <circle cx="500" cy="492" r="34" fill="#23262b" stroke="#6d737b" stroke-width="3"/>
      <path d="M486 488H514M500 474V502" stroke="#9aa1a9" stroke-width="5" opacity=".7"/>
    </g>
  `;
  root.append(svg);
  const wheel = required(svg.querySelector<SVGGElement>('[data-part="wheel"]'));
  const mirrorScene = required(svg.querySelector<SVGGElement>('[data-part="mirror-scene"]'));
  const speed = required(svg.querySelector<SVGTextElement>('[data-part="speed"]'));
  return { root, wheel, mirrorScene, speed };
}

export function updateCockpitHud(
  hud: CockpitHud,
  options: { visible: boolean; steering: number; speedKmh: number; rearView: boolean },
) {
  hud.root.dataset.visible = options.visible ? "true" : "false";
  hud.root.dataset.rearView = options.rearView ? "true" : "false";
  const steering = Math.max(-1, Math.min(1, options.steering));
  hud.wheel.style.transform = `rotate(${steering * 105}deg)`;
  hud.mirrorScene.style.transform = `translateX(${steering * -24}px)`;
  hud.speed.textContent = `${Math.round(options.speedKmh)} KM/H`;
}

function required<T>(value: T | null): T {
  if (value === null) throw new Error("Cockpit SVG part missing");
  return value;
}

export const COCKPIT_CSS = `
.turbo-cockpit{position:absolute;z-index:7;inset:0;pointer-events:none;opacity:0;transition:opacity .16s;overflow:hidden}
.turbo-cockpit[data-visible="true"]{opacity:1}
.turbo-cockpit svg{display:block;width:100%;height:100%}
.turbo-cockpit [data-part="wheel"]{transform-box:fill-box;transform-origin:center;transition:transform 70ms linear}
.turbo-cockpit [data-part="mirror-scene"]{transition:transform 80ms linear}
.turbo-cockpit[data-rear-view="true"] [data-part="mirror-scene"]{filter:brightness(.78) saturate(.82)}
@media(max-height:430px){.turbo-cockpit svg{transform:translateY(8%) scale(1.06)}}
`;
