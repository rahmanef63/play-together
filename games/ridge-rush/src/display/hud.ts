import { CHECKPOINTS, progressRatio } from "../shared/course.js";
import type { RiderView, RidgeViewState } from "./model.js";

export interface RidgeHud {
  host: HTMLElement;
  title: HTMLElement;
  speed: HTMLElement;
  place: HTMLElement;
  progress: HTMLElement;
  stamina: HTMLElement;
  center: HTMLElement;
  results: HTMLElement;
}

export function createHud(root: HTMLElement): RidgeHud {
  const host = document.createElement("section");
  host.className = "ridge-rush";
  host.style.cssText =
    "width:100%;height:100%;position:relative;overflow:hidden;background:#132d27;color:#fff;font-family:system-ui,sans-serif";
  const top = document.createElement("div");
  top.style.cssText =
    "position:absolute;z-index:3;left:14px;right:14px;top:12px;display:flex;justify-content:space-between;gap:12px;pointer-events:none;text-shadow:0 1px 3px #000";
  const title = document.createElement("strong");
  const place = document.createElement("strong");
  top.append(title, place);
  const speed = document.createElement("strong");
  speed.style.cssText =
    "position:absolute;z-index:3;right:18px;bottom:24px;font-size:clamp(28px,7vw,72px);font-variant-numeric:tabular-nums;text-shadow:0 2px 4px #000";
  const meters = document.createElement("div");
  meters.style.cssText =
    "position:absolute;z-index:3;left:16px;right:16px;bottom:16px;display:grid;gap:5px;pointer-events:none";
  const progressTrack = meter("#facc15");
  const staminaTrack = meter("#34d399");
  const progress = progressTrack.firstElementChild as HTMLElement;
  const stamina = staminaTrack.firstElementChild as HTMLElement;
  meters.append(progressTrack, staminaTrack);
  const center = document.createElement("div");
  center.style.cssText =
    "position:absolute;z-index:4;inset:0;display:grid;place-items:center;pointer-events:none;text-align:center;font-weight:900;font-size:clamp(32px,10vw,96px);text-shadow:0 3px 8px #000";
  const results = document.createElement("div");
  results.style.cssText =
    "position:absolute;z-index:5;inset:12% 12%;display:none;align-content:center;gap:8px;padding:clamp(16px,4vw,34px);background:#0b1715e8;border:1px solid #ffffff38;border-radius:14px;overflow:auto";
  host.append(top, speed, meters, center, results);
  root.replaceChildren(host);
  return { host, title, speed, place, progress, stamina, center, results };
}

export function updateHud(hud: RidgeHud, state: RidgeViewState, me: RiderView | undefined): void {
  const place = me ? state.riders.findIndex((rider) => rider.id === me.id) + 1 : 0;
  hud.title.textContent = me
    ? `RIDGE RUSH · CP ${Math.min(me.checkpoint + 1, CHECKPOINTS.length)}/${CHECKPOINTS.length}`
    : "RIDGE RUSH";
  hud.place.textContent = me ? `${ordinal(place)} / ${state.riders.length}` : "WAITING";
  hud.speed.textContent = me ? `${Math.round(me.speed * 3.6)} km/h` : "0 km/h";
  hud.progress.style.width = `${Math.round(progressRatio(me?.progress ?? 0) * 100)}%`;
  hud.stamina.style.width = `${Math.round(me?.stamina ?? 0)}%`;
  hud.center.textContent = centerMessage(state, me);
  const finished = state.phase === "finished";
  hud.results.style.display = finished ? "grid" : "none";
  if (finished) renderResults(hud.results, state);
}

function centerMessage(state: RidgeViewState, me: RiderView | undefined): string {
  if (me?.crashed && me.crashed > 0) return "RECOVERING";
  if (me?.finishedAt !== null && me?.finishedAt !== undefined) return "FINISH";
  if (state.phase === "countdown") return String(Math.max(1, Math.ceil(state.countdownMs / 1000)));
  if (state.phase === "lobby") {
    const humans = state.riders.filter((rider) => !rider.bot);
    return humans.length && humans.every((rider) => rider.ready) ? "READY" : "PRESS START";
  }
  return "";
}

function renderResults(host: HTMLElement, state: RidgeViewState): void {
  host.replaceChildren();
  const heading = document.createElement("strong");
  heading.textContent = "RIDGE COMPLETE";
  heading.style.cssText = "font-size:clamp(24px,6vw,56px);letter-spacing:-.03em";
  host.append(heading);
  state.riders.forEach((rider, index) => {
    const row = document.createElement("div");
    row.style.cssText =
      "display:grid;grid-template-columns:3ch 1fr auto;gap:10px;padding:8px 0;border-top:1px solid #ffffff22;font-weight:700";
    const time = rider.finishedAt === null ? "DNF" : `${(rider.finishedAt / 1000).toFixed(2)}s`;
    row.append(text(`${index + 1}.`), text(rider.name), text(time));
    host.append(row);
  });
  const note = document.createElement("small");
  note.textContent = "Press START on every connected controller for a rematch.";
  note.style.opacity = "0.72";
  host.append(note);
}

function meter(color: string): HTMLElement {
  const track = document.createElement("div");
  track.style.cssText =
    "height:5px;max-width:42%;background:#0008;border:1px solid #fff2;overflow:hidden";
  const fill = document.createElement("span");
  fill.style.cssText = `display:block;height:100%;width:0;background:${color};transition:width 90ms linear`;
  track.append(fill);
  return track;
}

function ordinal(value: number): string {
  if (value === 1) return "1ST";
  if (value === 2) return "2ND";
  if (value === 3) return "3RD";
  return `${value}TH`;
}

function text(value: string): Text {
  return document.createTextNode(value);
}
