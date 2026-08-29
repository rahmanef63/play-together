import type { ControllerGameModule } from "@play-together/game-sdk";

interface S {
  kind: "target-blast";
  round: number;
  targets: Array<{ id: number; x: number; y: number; r: number }>;
  players: Array<{ id: string; score: number; shots: number; hits: number }>;
}
const ok = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as { kind?: unknown }).kind === "target-blast";
export const mountController: ControllerGameModule["mountController"] = (root, ctx) => {
  root.replaceChildren();
  const sh = document.createElement("section");
  sh.style.cssText =
    "height:100%;display:grid;grid-template-rows:auto 1fr;gap:12px;padding:12px;background:#090d18;color:white";
  const info = document.createElement("strong");
  info.style.cssText = "font:800 17px system-ui";
  const pad = document.createElement("div");
  pad.setAttribute("role", "button");
  pad.setAttribute("aria-label", "Target aiming pad");
  pad.tabIndex = 0;
  pad.style.cssText =
    "position:relative;border-radius:26px;background:radial-gradient(circle at 50% 50%,#1d3150,#0f172a 70%);overflow:hidden;touch-action:none;cursor:crosshair;box-shadow:inset 0 0 0 2px #ffffff15";
  sh.append(info, pad);
  root.append(sh);
  let state: S | null = null;
  const draw = () => {
    pad.replaceChildren();
    if (!state) return;
    for (const t of state.targets) {
      const e = document.createElement("span");
      e.style.cssText = `position:absolute;left:${t.x * 100}%;top:${t.y * 100}%;width:${t.r * 200}%;aspect-ratio:1;border-radius:50%;transform:translate(-50%,-50%);background:#ff4d6d;box-shadow:0 0 0 6px #fff3 inset,0 0 26px #ff4d6d88`;
      pad.append(e);
    }
  };
  const shoot = (x: number, y: number) => {
    ctx.sendInput({ action: "shoot", x, y });
    navigator.vibrate?.(5);
  };
  pad.addEventListener("pointerdown", (e) => {
    const r = pad.getBoundingClientRect();
    shoot((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  });
  const u = ctx.subscribe((m) => {
    if (!ok(m.state)) return;
    state = m.state;
    const me = state.players.find((p) => p.id === ctx.playerId);
    info.textContent = `TARGET BLAST · ${me?.score ?? 0} pts · ${me?.hits ?? 0}/${me?.shots ?? 0} hits`;
    draw();
  });
  ctx.setStatus("Target Blast aiming pad ready");
  return () => {
    u();
    root.replaceChildren();
  };
};
