import type { ControllerGameModule } from "@play-together/game-sdk";

interface S {
  kind: "reaction-rush";
  phase: "armed" | "go" | "result";
  round: number;
  winnerId: string | null;
  players: Array<{ id: string; score: number; falseStarts: number }>;
}
const isS = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as { kind?: unknown }).kind === "reaction-rush";
export const mountController: ControllerGameModule["mountController"] = (root, ctx) => {
  root.replaceChildren();
  const shell = document.createElement("section");
  shell.style.cssText =
    "height:100%;display:grid;grid-template-rows:auto 1fr;gap:16px;padding:16px;background:#101014;color:white";
  const info = document.createElement("div");
  info.style.cssText = "font:800 16px/1.3 system-ui;display:flex;justify-content:space-between";
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", "Reaction button");
  button.textContent = "WAIT";
  button.style.cssText =
    "border:0;border-radius:28px;font:950 clamp(48px,18vw,100px)/1 system-ui;touch-action:manipulation;background:#3a3a42;color:white;box-shadow:0 12px 0 #222229";
  shell.append(info, button);
  root.append(shell);
  let phase: S["phase"] = "armed";
  const render = (s: S) => {
    phase = s.phase;
    const me = s.players.find((p) => p.id === ctx.playerId);
    info.textContent = `ROUND ${s.round}  •  SCORE ${me?.score ?? 0}`;
    button.textContent = s.phase === "go" ? "GO!" : s.phase === "armed" ? "WAIT" : "RESET";
    button.style.background =
      s.phase === "go" ? "#57e389" : s.phase === "armed" ? "#e05252" : "#6b6b78";
  };
  const hit = () => {
    ctx.sendInput({ action: "hit" });
    navigator.vibrate?.(phase === "go" ? 18 : 8);
  };
  button.addEventListener("pointerdown", hit);
  const key = (e: KeyboardEvent) => {
    if ((e.code === "Space" || e.code === "Enter") && !e.repeat) {
      e.preventDefault();
      hit();
    }
  };
  window.addEventListener("keydown", key);
  const unsub = ctx.subscribe((m) => {
    if (isS(m.state)) render(m.state);
  });
  ctx.setStatus("Reaction Rush controller ready");
  return () => {
    unsub();
    button.removeEventListener("pointerdown", hit);
    window.removeEventListener("keydown", key);
    root.replaceChildren();
  };
};
