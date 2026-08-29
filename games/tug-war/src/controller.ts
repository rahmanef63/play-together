import type { ControllerGameModule } from "@play-together/game-sdk";

interface S {
  kind: "tug-war";
  phase: string;
  rope: number;
  round: number;
  players: Array<{ id: string; team: 0 | 1; taps: number }>;
  teamWins: [number, number];
}
const ok = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as { kind?: unknown }).kind === "tug-war";
export const mountController: ControllerGameModule["mountController"] = (root, ctx) => {
  root.replaceChildren();
  const s = document.createElement("section");
  s.style.cssText =
    "height:100%;display:grid;grid-template-rows:auto 1fr;gap:16px;padding:16px;background:#17120b;color:#fff";
  const info = document.createElement("strong");
  info.style.cssText = "font:800 18px system-ui";
  const b = document.createElement("button");
  b.type = "button";
  b.setAttribute("aria-label", "Pull rope");
  b.textContent = "PULL";
  b.style.cssText =
    "border:0;border-radius:34px;background:#f59e0b;color:#231707;font:950 clamp(54px,20vw,110px)/1 system-ui;box-shadow:0 14px 0 #9a5d08;touch-action:manipulation";
  s.append(info, b);
  root.append(s);
  let team = 0;
  const pull = () => {
    ctx.sendInput({ action: "pull" });
    navigator.vibrate?.(6);
  };
  b.addEventListener("pointerdown", pull);
  const u = ctx.subscribe((m) => {
    if (!ok(m.state)) return;
    const me = m.state.players.find((p) => p.id === ctx.playerId);
    team = me?.team ?? 0;
    info.textContent = `TEAM ${team === 0 ? "LEFT" : "RIGHT"} · ROUND ${m.state.round} · TAPS ${me?.taps ?? 0}`;
    b.style.background = team === 0 ? "#38bdf8" : "#fb7185";
  });
  return () => {
    u();
    b.removeEventListener("pointerdown", pull);
    root.replaceChildren();
  };
};
