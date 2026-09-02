import type { Racer, TurboState } from "./model.js";

export class RaceEffects {
  readonly #style = document.createElement("style");
  readonly #speed = layer("turbo-speed-fx");
  readonly #item = layer("turbo-item-slot");
  readonly #drift = layer("turbo-drift-callout");
  readonly #shield = layer("turbo-shield-callout");
  readonly #confetti = layer("turbo-confetti");
  #previousItem: Racer["item"] = null;
  #rouletteTimer = 0;
  constructor(host: HTMLElement) {
    this.#style.textContent = CSS;
    for (let index = 0; index < 28; index++) {
      const piece = document.createElement("i");
      piece.style.setProperty("--x", `${(index * 37) % 101}%`);
      piece.style.setProperty("--delay", `${(index % 7) * 34}ms`);
      piece.style.setProperty("--spin", `${180 + (index % 5) * 90}deg`);
      piece.dataset.tone = String(index % 4);
      this.#confetti.append(piece);
    }
    host.append(this.#style, this.#speed, this.#item, this.#drift, this.#shield, this.#confetti);
  }
  sync(state: TurboState, racer: Racer) {
    const fast = racer.speed > 34 || racer.boostTimer > 0;
    this.#speed.dataset.active = String(fast && state.phase === "racing");
    this.#speed.dataset.boost = String(racer.boostTimer > 0);
    this.#speed.dataset.hit = String(racer.spinTimer > 0);
    this.#speed.dataset.scraping = String(racer.scraping);
    if (!this.#previousItem && racer.item) this.#startRoulette();
    this.#previousItem = racer.item;
    if (!this.#rouletteTimer) this.#item.textContent = itemLabel(racer.item);
    this.#item.dataset.hasItem = String(Boolean(racer.item));
    this.#drift.textContent =
      racer.driftTier === 2
        ? "SUPER MINI-TURBO"
        : racer.driftTier === 1
          ? "MINI-TURBO"
          : racer.drafting
            ? "SLIPSTREAM"
            : "";
    this.#drift.dataset.active = String(Boolean(this.#drift.textContent));
    this.#shield.textContent =
      racer.invulnerableTimer > 0
        ? `RECOVERING · SHIELD ${racer.invulnerableTimer.toFixed(1)}s`
        : "";
    this.#shield.dataset.active = String(racer.invulnerableTimer > 0);
    this.#confetti.dataset.active = String(state.phase === "finished" && racer.finished);
  }
  reset() {
    window.clearTimeout(this.#rouletteTimer);
    this.#rouletteTimer = 0;
    this.#previousItem = null;
    this.#item.textContent = "NO ITEM";
    delete this.#item.dataset.roulette;
    this.#confetti.dataset.active = "false";
  }
  dispose() {
    this.reset();
    for (const element of [
      this.#style,
      this.#speed,
      this.#item,
      this.#drift,
      this.#shield,
      this.#confetti,
    ])
      element.remove();
  }
  #startRoulette() {
    window.clearTimeout(this.#rouletteTimer);
    this.#item.textContent = "?";
    this.#item.dataset.roulette = "true";
    this.#rouletteTimer = window.setTimeout(() => {
      this.#rouletteTimer = 0;
      delete this.#item.dataset.roulette;
      this.#item.textContent = itemLabel(this.#previousItem);
    }, 480);
  }
}
function layer(className: string) {
  const element = document.createElement("div");
  element.className = className;
  element.setAttribute("aria-hidden", "true");
  return element;
}
function itemLabel(item: Racer["item"]) {
  return item ?? "NO ITEM";
}
const CSS = `
.turbo-speed-fx{position:absolute;z-index:5;inset:-12%;pointer-events:none;opacity:0;transition:opacity .18s,box-shadow .08s;background:repeating-conic-gradient(from 0deg at 50% 52%,transparent 0 3deg,#ffffff16 3.3deg 3.7deg,transparent 4deg 9deg);mask-image:radial-gradient(circle at 50% 52%,transparent 0 22%,#000 58%,#000 100%);transform:scale(1.05);animation:turbo-streak .34s linear infinite}.turbo-speed-fx[data-active="true"]{opacity:.48}.turbo-speed-fx[data-boost="true"]{opacity:.78;animation-duration:.18s}.turbo-speed-fx[data-hit="true"]{box-shadow:inset 0 0 100px #ef444477}.turbo-speed-fx[data-scraping="true"]{box-shadow:inset 0 0 70px #f9731655}.turbo-item-slot{position:absolute;z-index:9;right:12px;bottom:52px;min-width:78px;padding:7px 9px;border:2px solid #e9e3d4;background:#0b0d10e8;color:#d7d1c4;font:1000 10px/1 system-ui;text-align:center;letter-spacing:.08em;pointer-events:none}.turbo-item-slot[data-has-item="true"]{color:#f0c85f;border-color:#f0c85f}.turbo-item-slot[data-roulette="true"]{animation:turbo-roulette .08s steps(2) infinite}.turbo-drift-callout{position:absolute;z-index:9;left:50%;bottom:23%;transform:translateX(-50%) scale(.92);opacity:0;padding:7px 11px;border:2px solid #77e2ff;background:#07121cdd;color:#dff9ff;font:1000 11px/1 system-ui;letter-spacing:.1em;pointer-events:none;transition:opacity .12s,transform .12s}.turbo-drift-callout[data-active="true"]{opacity:1;transform:translateX(-50%) scale(1)}.turbo-shield-callout{position:absolute;z-index:9;left:50%;bottom:31%;transform:translateX(-50%);opacity:0;padding:6px 10px;border:1px solid #8be8ff;background:#0b3542dd;color:#e6fbff;font:900 9px/1 system-ui;letter-spacing:.08em;pointer-events:none}.turbo-shield-callout[data-active="true"]{opacity:1}.turbo-confetti{position:absolute;z-index:14;inset:0;overflow:hidden;pointer-events:none;visibility:hidden}.turbo-confetti[data-active="true"]{visibility:visible}.turbo-confetti i{position:absolute;left:var(--x);top:-8%;width:7px;height:13px;background:#f0c85f;animation:turbo-confetti-fall 1.8s cubic-bezier(.22,.7,.3,1) var(--delay) infinite}.turbo-confetti i[data-tone="1"]{background:#77e2ff}.turbo-confetti i[data-tone="2"]{background:#f85f6a}.turbo-confetti i[data-tone="3"]{background:#74e49a}.turbo-sound{position:absolute;z-index:15;right:12px;top:14px;padding:6px 8px;border:1px solid #ffffff38;background:#0a0d11d9;color:#e9e3d4;font:900 9px/1 system-ui;letter-spacing:.08em;cursor:pointer}.turbo-sound[data-enabled="false"]{opacity:.58}.turbo-circuit[data-phase="setup"] .turbo-sound{top:auto;bottom:8px;right:8px}.turbo-circuit[data-phase="setup"] .turbo-speed-fx,.turbo-circuit[data-phase="setup"] .turbo-item-slot,.turbo-circuit[data-phase="setup"] .turbo-drift-callout,.turbo-circuit[data-phase="setup"] .turbo-shield-callout{opacity:0}@keyframes turbo-confetti-fall{to{transform:translateY(120vh) rotate(var(--spin));opacity:.2}}@keyframes turbo-streak{to{transform:scale(1.12) rotate(.6deg)}}@keyframes turbo-roulette{50%{transform:scale(.93)}}
`;
