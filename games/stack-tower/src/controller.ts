import type { ControllerGameModule } from "@play-together/game-sdk";

interface S {
  kind: "stack-tower";
  round: number;
  players: Array<{
    id: string;
    height: number;
    width: number;
    baseX: number;
    cursor: number;
    wins: number;
  }>;
}
const ok = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as { kind?: unknown }).kind === "stack-tower";
export const mountController: ControllerGameModule["mountController"] = (root, ctx) => {
  root.replaceChildren();
  const w = document.createElement("section");
  w.style.cssText =
    "height:100%;display:grid;grid-template-rows:auto 1fr auto;gap:12px;padding:12px;background:#08130f;color:white";
  const info = document.createElement("strong");
  const arena = document.createElement("div");
  arena.style.cssText = "position:relative;border-radius:22px;background:#10271d;overflow:hidden";
  const block = document.createElement("span");
  block.style.cssText =
    "position:absolute;top:18px;height:42px;background:#5eead4;border-radius:10px;transform:translateX(-50%);transition:left .03s linear";
  arena.append(block);
  const drop = document.createElement("button");
  drop.type = "button";
  drop.setAttribute("aria-label", "Drop block");
  drop.textContent = "DROP";
  drop.style.cssText =
    "border:0;border-radius:22px;background:#fbbf24;color:#1f1502;font:950 42px/1 system-ui;padding:24px;touch-action:manipulation";
  w.append(info, arena, drop);
  root.append(w);
  const hit = () => {
    ctx.sendInput({ action: "drop" });
    navigator.vibrate?.(8);
  };
  drop.addEventListener("pointerdown", hit);
  const u = ctx.subscribe((m) => {
    if (!ok(m.state)) return;
    const me = m.state.players.find((p) => p.id === ctx.playerId);
    info.textContent = `STACK ${me?.height ?? 0}/10 · WINS ${me?.wins ?? 0}`;
    if (me) {
      block.style.left = `${me.cursor * 100}%`;
      block.style.width = `${me.width * 100}%`;
    }
  });
  return () => {
    u();
    drop.removeEventListener("pointerdown", hit);
    root.replaceChildren();
  };
};
