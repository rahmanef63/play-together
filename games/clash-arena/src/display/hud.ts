import type { ArenaState, ViewFighter } from "./model.js";

interface FighterHud {
  host: HTMLElement;
  name: HTMLElement;
  hp: HTMLElement;
  meter: HTMLElement;
  rounds: HTMLElement;
}
export interface ArenaHud {
  host: HTMLElement;
  left: FighterHud;
  center: HTMLElement;
  right: FighterHud;
}

export function makeHud(root: HTMLElement): ArenaHud {
  const host = document.createElement("section");
  host.className = "clash-arena";
  const style = document.createElement("style");
  style.textContent = CSS;
  const top = document.createElement("header");
  top.className = "clash-hud";
  const left = fighterHud("left"),
    right = fighterHud("right"),
    center = document.createElement("strong");
  center.className = "clash-hud__timer";
  top.append(left.host, center, right.host);
  host.append(style, top);
  root.replaceChildren(host);
  return { host, left, center, right };
}

export function hud(h: ArenaHud, state: ArenaState) {
  const [left, right] = state.fighters;
  updateFighter(h.left, left);
  updateFighter(h.right, right);
  h.center.textContent =
    state.phase === "fight"
      ? `${Math.max(0, Math.ceil(state.timerMs / 1000))}`
      : state.phase === "match-over"
        ? "MATCH"
        : state.event;
  h.host.dataset.phase = state.phase;
  h.host.dataset.event = state.event || "";
}

function fighterHud(side: "left" | "right"): FighterHud {
  const host = document.createElement("section");
  host.className = `clash-fighter-hud clash-fighter-hud--${side}`;
  const name = document.createElement("strong");
  const hpTrack = track("hp"),
    hp = hpTrack.querySelector("i") as HTMLElement;
  const meterTrack = track("meter"),
    meter = meterTrack.querySelector("i") as HTMLElement;
  const rounds = document.createElement("span");
  rounds.className = "clash-fighter-hud__rounds";
  host.append(name, hpTrack, meterTrack, rounds);
  return { host, name, hp, meter, rounds };
}

function updateFighter(h: FighterHud, fighter: ViewFighter | undefined) {
  if (!fighter) {
    h.name.textContent = "WAITING";
    h.hp.style.width = "0%";
    h.meter.style.width = "0%";
    h.rounds.textContent = "○ ○";
    return;
  }
  h.name.textContent = fighter.name;
  h.hp.style.width = `${Math.max(0, Math.min(100, fighter.hp))}%`;
  h.meter.style.width = `${Math.max(0, Math.min(100, fighter.meter))}%`;
  h.rounds.textContent =
    `${"● ".repeat(fighter.wins)}${"○ ".repeat(Math.max(0, 2 - fighter.wins))}`.trim();
}

function track(kind: "hp" | "meter") {
  const track = document.createElement("div");
  track.className = `clash-meter clash-meter--${kind}`;
  track.append(document.createElement("i"));
  return track;
}

const CSS = `
.clash-arena{position:relative;width:100%;height:100%;overflow:hidden;background:#050713;color:#fff;font-family:system-ui,sans-serif}.clash-hud{position:absolute;z-index:5;left:clamp(10px,2.5vw,24px);right:clamp(10px,2.5vw,24px);top:clamp(9px,2vw,18px);display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:start;gap:clamp(10px,3vw,32px);pointer-events:none;text-shadow:0 2px 5px #000}.clash-fighter-hud{display:grid;gap:5px;min-width:0}.clash-fighter-hud--right{text-align:right}.clash-fighter-hud>strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:950 clamp(11px,2.2vw,16px)/1 system-ui;letter-spacing:.06em}.clash-meter{height:clamp(6px,1.3vw,10px);overflow:hidden;border:1px solid #ffffff35;background:#050812c7}.clash-meter i{display:block;height:100%;width:0;transition:width 90ms linear}.clash-meter--hp i{background:linear-gradient(90deg,#ef476f,#ff6b6b)}.clash-fighter-hud--right .clash-meter i{margin-left:auto}.clash-meter--meter{height:4px}.clash-meter--meter i{background:#f7c948}.clash-fighter-hud__rounds{color:#dce5f4;font:850 9px/1 ui-monospace,monospace;letter-spacing:.08em}.clash-hud__timer{min-width:46px;padding:7px 8px;border:1px solid #ffffff32;background:#090d1be0;text-align:center;font:1000 clamp(16px,3vw,24px)/1 ui-monospace,monospace;letter-spacing:-.04em}.clash-arena[data-event*="HIT"] .clash-hud__timer{color:#ffd166}.clash-arena[data-event="BLOCK"] .clash-hud__timer{color:#66d9ff}@media(max-width:560px){.clash-hud{gap:8px}.clash-fighter-hud__rounds{display:none}}
`;
