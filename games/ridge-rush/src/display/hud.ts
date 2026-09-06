import { CHECKPOINTS, courseSurface, gradeDegrees, progressRatio } from "../shared/course.js";
import type { RiderView, RidgeViewState } from "./model.js";
export interface RidgeHud {
  host: HTMLElement;
  title: HTMLElement;
  speed: HTMLElement;
  unit: HTMLElement;
  place: HTMLElement;
  meta: HTMLElement;
  progress: HTMLElement;
  stamina: HTMLElement;
  center: HTMLElement;
  results: HTMLElement;
}
export function createHud(root: HTMLElement): RidgeHud {
  const host = document.createElement("section");
  host.className = "ridge-rush";
  const style = document.createElement("style");
  style.textContent = CSS;
  const top = div("ridge-hud__top"),
    brand = div("ridge-hud__brand"),
    title = document.createElement("strong"),
    meta = document.createElement("span"),
    place = document.createElement("strong");
  brand.append(title, meta);
  top.append(brand, place);
  const speedCard = div("ridge-hud__speed"),
    speed = document.createElement("strong"),
    unit = document.createElement("span");
  unit.textContent = "KM/H";
  speedCard.append(speed, unit);
  const meters = div("ridge-hud__meters"),
    progressTrack = meter("progress"),
    staminaTrack = meter("stamina");
  const progress = progressTrack.querySelector("i") as HTMLElement,
    stamina = staminaTrack.querySelector("i") as HTMLElement;
  meters.append(progressTrack, staminaTrack);
  const center = div("ridge-hud__center"),
    results = div("ridge-hud__results");
  host.append(style, top, speedCard, meters, center, results);
  root.replaceChildren(host);
  return { host, title, speed, unit, place, meta, progress, stamina, center, results };
}
export function updateHud(h: RidgeHud, state: RidgeViewState, me: RiderView | undefined) {
  const place = me ? state.riders.findIndex((r) => r.id === me.id) + 1 : 0,
    grade = me ? Math.max(0, Math.round(gradeDegrees(me.progress))) : 0;
  h.title.textContent = "RIDGE RUSH";
  h.meta.textContent = me
    ? `${grade}° · ${courseSurface(me.progress).toUpperCase()} · CP ${Math.min(me.checkpoint + 1, CHECKPOINTS.length)}/${CHECKPOINTS.length} · ${me.score} PTS`
    : "EXTREME DESCENT";
  h.place.textContent = me ? `${ordinal(place)} / ${state.riders.length}` : "WAITING";
  h.speed.textContent = String(me ? Math.round(me.speed * 3.6) : 0);
  h.progress.style.width = `${Math.round(progressRatio(me?.progress ?? 0) * 100)}%`;
  h.stamina.style.width = `${Math.round(me?.stamina ?? 0)}%`;
  h.center.textContent = centerMessage(state, me);
  const finished = state.phase === "finished";
  h.results.hidden = !finished;
  if (finished) renderResults(h.results, state);
}
function centerMessage(state: RidgeViewState, me?: RiderView) {
  if (me?.crashed && me.crashed > 0) return "RECOVERING";
  if (me?.finishedAt != null) return "FINISH";
  if (me?.currentTrick)
    return `${me.currentTrick} · ${me.pendingStyle} PTS${me.combo > 1 ? ` · x${me.combo}` : ""}`;
  if (me && !me.grounded && me.airTimeMs > 140) return `AIR ${(me.airTimeMs / 1000).toFixed(1)}s`;
  if (me?.hitFeedback && me.hitFeedback > 0) return "CONTACT";
  if (me?.powerslide) return "POWER SLIDE";
  if (me?.sprinting) return "SPRINT";
  if (me?.frontBrake) return "FRONT BRAKE";
  if (state.phase === "countdown") return String(Math.max(1, Math.ceil(state.countdownMs / 1000)));
  if (state.phase === "lobby")
    return state.riders.filter((r) => !r.bot).every((r) => r.ready) ? "READY" : "PRESS START";
  return "";
}
function renderResults(host: HTMLElement, state: RidgeViewState) {
  host.replaceChildren();
  const heading = document.createElement("strong");
  heading.textContent = "RIDGE COMPLETE";
  host.append(heading);
  state.riders.forEach((r, index) => {
    const row = div("ridge-result");
    row.append(
      text(`${index + 1}.`),
      text(r.name),
      text(r.finishedAt == null ? "DNF" : `${(r.finishedAt / 1000).toFixed(2)}s`),
    );
    host.append(row);
  });
  const note = document.createElement("small");
  note.textContent = "Press START on every connected controller for a rematch.";
  host.append(note);
}
function meter(kind: string) {
  const track = div(`ridge-meter ridge-meter--${kind}`),
    fill = document.createElement("i");
  track.append(fill);
  return track;
}
function div(className: string) {
  const el = document.createElement("div");
  el.className = className;
  return el;
}
function text(value: string) {
  return document.createTextNode(value);
}
function ordinal(value: number) {
  return value === 1 ? "1ST" : value === 2 ? "2ND" : value === 3 ? "3RD" : `${value}TH`;
}
const CSS = `
.ridge-rush{width:100%;height:100%;position:relative;overflow:hidden;background:#17252b;color:#f7f5ee;font-family:system-ui,sans-serif}.ridge-hud__top{position:absolute;z-index:4;left:14px;right:14px;top:12px;display:flex;justify-content:space-between;align-items:start;gap:12px;pointer-events:none;text-shadow:0 2px 6px #000}.ridge-hud__brand{display:grid;gap:2px;padding:8px 10px;border-left:3px solid #f7b955;background:#091015b8;backdrop-filter:blur(6px)}.ridge-hud__brand strong{font:950 15px/1 system-ui;letter-spacing:.08em}.ridge-hud__brand span{font:750 9px/1.2 ui-monospace,monospace;color:#d7d8d3}.ridge-hud__top>strong{padding:8px 10px;background:#091015b8;font:950 13px/1 ui-monospace,monospace}.ridge-hud__speed{position:absolute;z-index:4;right:16px;bottom:20px;display:grid;justify-items:end;padding:8px 10px;background:#091015b8;border-right:3px solid #f7b955;pointer-events:none}.ridge-hud__speed strong{font:1000 clamp(34px,8vw,76px)/.82 ui-monospace,monospace;letter-spacing:-.08em}.ridge-hud__speed span{font:850 9px/1 system-ui;letter-spacing:.16em;color:#d6d9d8}.ridge-hud__meters{position:absolute;z-index:4;left:16px;bottom:18px;width:min(44%,320px);display:grid;gap:7px;pointer-events:none}.ridge-meter{height:7px;background:#071015b8;border:1px solid #ffffff25;overflow:hidden}.ridge-meter i{display:block;height:100%;width:0;transition:width 90ms linear}.ridge-meter--progress i{background:#f7b955}.ridge-meter--stamina i{background:#5ee3a4}.ridge-hud__center{position:absolute;z-index:5;inset:0;display:grid;place-items:center;pointer-events:none;text-align:center;font:1000 clamp(30px,9vw,90px)/1 system-ui;letter-spacing:-.04em;text-shadow:0 4px 14px #000}.ridge-hud__results{position:absolute;z-index:8;inset:12% 12%;display:grid;align-content:center;gap:8px;padding:clamp(16px,4vw,34px);background:#07100feF;border:1px solid #ffffff35;overflow:auto}.ridge-hud__results[hidden]{display:none}.ridge-hud__results>strong{font:1000 clamp(24px,6vw,54px)/1 system-ui}.ridge-result{display:grid;grid-template-columns:3ch 1fr auto;gap:10px;padding:8px 0;border-top:1px solid #ffffff22;font-weight:800}.ridge-hud__results small{color:#a8b0ae}@media(max-width:600px){.ridge-hud__brand{padding:6px 8px}.ridge-hud__brand span{font-size:8px}.ridge-hud__meters{width:40%}.ridge-hud__speed{bottom:16px;right:12px}}
`;
