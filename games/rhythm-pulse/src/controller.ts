import type { ControllerGameModule } from "@play-together/game-sdk";

interface S {
  kind: "rhythm-pulse";
  beat: number;
  phase: number;
  bpm: number;
  players: Array<{
    id: string;
    score: number;
    combo: number;
    perfect: number;
    good: number;
    miss: number;
  }>;
}
const ok = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as { kind?: unknown }).kind === "rhythm-pulse";
export const mountController: ControllerGameModule["mountController"] = (root, ctx) => {
  root.replaceChildren();
  const w = document.createElement("section");
  w.style.cssText =
    "height:100%;display:grid;grid-template-rows:auto 1fr;gap:14px;padding:14px;background:#180d25;color:white";
  const info = document.createElement("strong");
  info.style.cssText = "font:800 17px system-ui";
  const tap = document.createElement("button");
  tap.type = "button";
  tap.setAttribute("aria-label", "Tap on beat");
  tap.textContent = "PULSE";
  tap.style.cssText =
    "align-self:center;justify-self:center;width:min(76vw,360px);aspect-ratio:1;border:0;border-radius:50%;background:#c084fc;color:#1c092d;font:950 clamp(44px,16vw,86px)/1 system-ui;touch-action:manipulation;box-shadow:0 0 80px #a855f766";
  w.append(info, tap);
  root.append(w);
  let phase = 0;
  const hit = () => {
    ctx.sendInput({ action: "tap" });
    navigator.vibrate?.(7);
  };
  tap.addEventListener("pointerdown", hit);
  const key = (e: KeyboardEvent) => {
    if (e.code === "Space" && !e.repeat) {
      e.preventDefault();
      hit();
    }
  };
  window.addEventListener("keydown", key);
  const u = ctx.subscribe((m) => {
    if (!ok(m.state)) return;
    phase = m.state.phase;
    const me = m.state.players.find((p) => p.id === ctx.playerId);
    info.textContent = `${m.state.bpm} BPM · SCORE ${me?.score ?? 0} · COMBO ${me?.combo ?? 0}`;
    const scale = 1 + Math.max(0, 1 - Math.min(phase, 1 - phase) * 5) * 0.12;
    tap.style.transform = `scale(${scale})`;
    tap.style.background = Math.min(phase, 1 - phase) < 0.07 ? "#f0abfc" : "#c084fc";
  });
  return () => {
    u();
    tap.removeEventListener("pointerdown", hit);
    window.removeEventListener("keydown", key);
    root.replaceChildren();
  };
};
