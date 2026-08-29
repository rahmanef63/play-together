import type { ControllerGameModule } from "@play-together/game-sdk";

interface S {
  kind: "orbit-dodge";
  level: number;
  players: Array<{ id: string; score: number; hits: number }>;
}
const ok = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as { kind?: unknown }).kind === "orbit-dodge";
export const mountController: ControllerGameModule["mountController"] = (root, ctx) => {
  root.replaceChildren();
  const w = document.createElement("section");
  w.style.cssText =
    "height:100%;display:grid;grid-template-rows:auto 1fr;gap:12px;padding:12px;background:#080b1d;color:white";
  const info = document.createElement("strong");
  const controls = document.createElement("div");
  controls.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:12px";
  const clean: Array<() => void> = [];
  for (const [label, val, name] of [
    ["↺", -1, "Rotate counterclockwise"],
    ["↻", 1, "Rotate clockwise"],
  ] as const) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.setAttribute("aria-label", name);
    b.style.cssText =
      "border:0;border-radius:50%;background:#818cf8;color:#11133b;font:950 clamp(62px,22vw,120px) system-ui;touch-action:none";
    const down = (e: PointerEvent) => {
        b.setPointerCapture(e.pointerId);
        ctx.sendInput({ rotate: val });
      },
      up = () => ctx.sendInput({ rotate: 0 });
    b.addEventListener("pointerdown", down);
    b.addEventListener("pointerup", up);
    b.addEventListener("pointercancel", up);
    clean.push(() => {
      b.removeEventListener("pointerdown", down);
      b.removeEventListener("pointerup", up);
      b.removeEventListener("pointercancel", up);
    });
    controls.append(b);
  }
  w.append(info, controls);
  root.append(w);
  const u = ctx.subscribe((m) => {
    if (ok(m.state)) {
      const me = m.state.players.find((p) => p.id === ctx.playerId);
      info.textContent = `ORBIT DODGE · LEVEL ${m.state.level} · ${Math.floor(me?.score ?? 0)} pts · HITS ${me?.hits ?? 0}`;
    }
  });
  return () => {
    u();
    for (const dispose of clean) dispose();
    root.replaceChildren();
  };
};
