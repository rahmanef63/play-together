import type { ControllerGameModule } from "@play-together/game-sdk";

interface S {
  kind: "memory-lights";
  phase: "show" | "input" | "result";
  round: number;
  sequence: number[];
  players: Array<{ id: string; score: number; progress: number }>;
}
const ok = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as { kind?: unknown }).kind === "memory-lights";
export const mountController: ControllerGameModule["mountController"] = (root, ctx) => {
  root.replaceChildren();
  const shell = document.createElement("section");
  shell.style.cssText =
    "height:100%;display:grid;grid-template-rows:auto 1fr;gap:14px;padding:14px;background:#111827;color:#fff";
  const info = document.createElement("strong");
  info.style.cssText = "font:800 18px/1.2 system-ui";
  const grid = document.createElement("div");
  grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:12px";
  const colors = ["#ef4444", "#3b82f6", "#22c55e", "#eab308"];
  const names = ["Red memory pad", "Blue memory pad", "Green memory pad", "Yellow memory pad"];
  const buttons = colors.map((c, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", names[i] ?? `Memory pad ${i + 1}`);
    b.textContent = String(i + 1);
    b.style.cssText = `border:0;border-radius:24px;background:${c};font:900 40px/1 system-ui;color:white;touch-action:manipulation;box-shadow:inset 0 -8px rgba(0,0,0,.2)`;
    b.addEventListener("pointerdown", () => {
      ctx.sendInput({ pad: i });
      navigator.vibrate?.(8);
    });
    grid.append(b);
    return b;
  });
  shell.append(info, grid);
  root.append(shell);
  const render = (s: S) => {
    const me = s.players.find((p) => p.id === ctx.playerId);
    info.textContent = `ROUND ${s.round} • ${s.phase.toUpperCase()} • SCORE ${me?.score ?? 0} • ${me?.progress ?? 0}/${s.sequence.length}`;
    for (const b of buttons) b.disabled = s.phase !== "input";
  };
  const u = ctx.subscribe((m) => {
    if (ok(m.state)) render(m.state);
  });
  const key = (e: KeyboardEvent) => {
    const i = ["1", "2", "3", "4"].indexOf(e.key);
    if (i >= 0) ctx.sendInput({ pad: i });
  };
  window.addEventListener("keydown", key);
  ctx.setStatus("Memory Lights pads ready");
  return () => {
    u();
    window.removeEventListener("keydown", key);
    root.replaceChildren();
  };
};
