import type { ArenaState, ViewFighter } from "./model.js";

type Slot = {
  host: HTMLElement;
  player: HTMLElement;
  fighter: HTMLElement;
  status: HTMLElement;
};
export type FightFlow = {
  host: HTMLElement;
  eyebrow: HTMLElement;
  title: HTMLElement;
  subtitle: HTMLElement;
  hint: HTMLElement;
  slots: [Slot, Slot];
  cards: HTMLElement[];
};

export function createFightFlow(parent: HTMLElement): FightFlow {
  const style = document.createElement("style");
  style.textContent = CSS;
  const host = document.createElement("section");
  host.className = "clash-flow";
  const eyebrow = document.createElement("b");
  eyebrow.className = "clash-flow__eyebrow";
  const title = document.createElement("strong");
  title.className = "clash-flow__title";
  const subtitle = document.createElement("span");
  subtitle.className = "clash-flow__subtitle";
  const roster = document.createElement("div");
  roster.className = "clash-flow__roster";
  const cards = [
    characterCard("nova-rin", "NOVA RIN", "PRESSURE · COUNTER"),
    characterCard("kite-vale", "KITE VALE", "REACH · PUNISH"),
  ];
  roster.append(...cards);
  const versus = document.createElement("div");
  versus.className = "clash-flow__versus";
  const slots: [Slot, Slot] = [playerSlot("P1"), playerSlot("P2")];
  const vs = document.createElement("i");
  vs.textContent = "VS";
  versus.append(slots[0].host, vs, slots[1].host);
  const hint = document.createElement("small");
  hint.className = "clash-flow__hint";
  host.append(eyebrow, title, subtitle, roster, versus, hint);
  parent.append(style, host);
  return { host, eyebrow, title, subtitle, hint, slots, cards };
}

export function updateFightFlow(flow: FightFlow, state: ArenaState): void {
  flow.host.dataset.phase = state.phase;
  flow.host.hidden = state.phase === "fight";
  const [left, right] = state.fighters;
  updateSlot(flow.slots[0], left, "P1");
  updateSlot(flow.slots[1], right, right?.bot ? "CPU" : "P2");
  for (const card of flow.cards) {
    const character = card.dataset.character;
    card.dataset.p1 = String(left?.character === character);
    card.dataset.p2 = String(right?.character === character);
  }
  if (state.phase === "select") {
    flow.eyebrow.textContent = "CLASH ARENA";
    flow.title.textContent = "CHOOSE YOUR FIGHTER";
    flow.subtitle.textContent = "Stick ◀ ▶ to choose · A / START confirm · B back";
    flow.hint.textContent = state.fighters.every((fighter) => fighter.ready)
      ? "LOCKED IN"
      : "WAITING FOR READY";
    return;
  }
  flow.eyebrow.textContent = state.phase === "match-over" ? "FINAL" : `ROUND ${state.round}`;
  if (state.phase === "intro") {
    flow.title.textContent = state.event === "REMATCH" ? "REMATCH" : "VERSUS";
    flow.subtitle.textContent = `${cleanName(left)}  VS  ${cleanName(right)}`;
    flow.hint.textContent = state.introMs <= 700 ? "FIGHT!" : `ROUND ${state.round}`;
  } else if (state.phase === "round-over") {
    flow.title.textContent = state.event;
    flow.subtitle.textContent = `ROUND SCORE  ${left?.wins ?? 0} — ${right?.wins ?? 0}`;
    flow.hint.textContent = "NEXT ROUND";
  } else if (state.phase === "match-over") {
    const winner = state.fighters.find((fighter) => fighter.id === state.winnerId);
    flow.title.textContent = winner ? `${cleanName(winner)} WINS` : "DRAW";
    flow.subtitle.textContent = "MATCH OVER";
    flow.hint.textContent = "START · REMATCH";
  }
}

function characterCard(character: string, name: string, style: string): HTMLElement {
  const card = document.createElement("article");
  card.className = "clash-flow__card";
  card.dataset.character = character;
  const label = document.createElement("strong");
  label.textContent = name;
  const detail = document.createElement("span");
  detail.textContent = style;
  card.append(label, detail);
  return card;
}

function playerSlot(label: string): Slot {
  const host = document.createElement("article");
  host.className = "clash-flow__slot";
  const player = document.createElement("b");
  player.textContent = label;
  const fighter = document.createElement("strong");
  const status = document.createElement("span");
  host.append(player, fighter, status);
  return { host, player, fighter, status };
}

function updateSlot(slot: Slot, fighter: ViewFighter | undefined, label: string): void {
  slot.player.textContent = label;
  slot.fighter.textContent = cleanName(fighter);
  slot.status.textContent = fighter ? (fighter.ready ? "READY" : "SELECTING") : "WAITING";
  slot.host.dataset.ready = String(Boolean(fighter?.ready));
  slot.host.dataset.character = fighter?.character ?? "";
}

function cleanName(fighter: ViewFighter | undefined): string {
  return fighter?.name.replace(" · CPU", "") ?? "WAITING";
}

const CSS = `
.clash-flow{position:absolute;z-index:8;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(8px,2vmin,18px);padding:clamp(14px,4vmin,42px);background:linear-gradient(180deg,#050713e8,#090d1bf4);text-align:center;pointer-events:none}.clash-flow[hidden]{display:none}.clash-flow__eyebrow{font:900 clamp(9px,1.6vmin,13px)/1 system-ui;letter-spacing:.24em;color:#91c9ff}.clash-flow__title{font:1000 clamp(26px,7vmin,68px)/.88 system-ui;letter-spacing:-.05em;text-shadow:0 8px 26px #000}.clash-flow__subtitle{font:750 clamp(10px,2.1vmin,15px)/1.35 system-ui;color:#b9c7d9}.clash-flow__roster{display:grid;grid-template-columns:repeat(2,minmax(0,190px));gap:clamp(8px,2vmin,16px);width:min(92%,410px)}.clash-flow__card{position:relative;display:grid;gap:5px;padding:clamp(12px,2.4vmin,22px);border:1px solid #ffffff28;background:#111a31c9;box-shadow:inset 0 1px #ffffff12}.clash-flow__card strong{font:950 clamp(14px,3vmin,24px)/1 system-ui}.clash-flow__card span{font:800 9px/1.2 ui-monospace,monospace;color:#91a4bd}.clash-flow__card[data-p1="true"]{border-left:5px solid #ff5b7d}.clash-flow__card[data-p2="true"]{border-right:5px solid #65d6ff}.clash-flow__versus{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:clamp(8px,3vmin,26px);width:min(94%,620px)}.clash-flow__versus>i{font:1000 clamp(14px,3.6vmin,28px)/1 system-ui;color:#f7c948}.clash-flow__slot{display:grid;gap:3px;min-width:0;padding:8px;border-top:1px solid #ffffff25}.clash-flow__slot b{font:900 9px/1 system-ui;letter-spacing:.16em;color:#91a4bd}.clash-flow__slot strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:950 clamp(12px,2.8vmin,20px)/1 system-ui}.clash-flow__slot span{font:850 9px/1 ui-monospace,monospace;color:#f7c948}.clash-flow__slot[data-ready="false"] span{color:#a3adba}.clash-flow__hint{font:900 clamp(9px,1.8vmin,12px)/1 system-ui;letter-spacing:.12em;color:#eef4ff}.clash-flow[data-phase="intro"] .clash-flow__roster,.clash-flow[data-phase="round-over"] .clash-flow__roster,.clash-flow[data-phase="match-over"] .clash-flow__roster{display:none}@media(max-height:430px){.clash-flow{gap:7px;padding:9px 18px}.clash-flow__roster{max-width:350px}.clash-flow__card{padding:9px}.clash-flow__versus{max-width:520px}}
`;
