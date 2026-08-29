import type { ControllerGameModule } from "@play-together/game-sdk";

interface S {
  kind: "dodge-dash";
  level: number;
  players: Array<{ id: string; score: number; hits: number }>;
}
const ok = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as { kind?: unknown }).kind === "dodge-dash";
export const mountController: ControllerGameModule["mountController"] = (root, ctx) => {
  root.replaceChildren();
  const w = document.createElement("section");
  w.style.cssText =
    "height:100%;display:grid;grid-template-rows:auto 1fr;gap:14px;padding:14px;background:#10131c;color:white";
  const info = document.createElement("strong");
  const controls = document.createElement("div");
  controls.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:14px";
  let move = 0;
  const mk = (label: string, val: number, name: string) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.setAttribute("aria-label", name);
    b.style.cssText =
      "border:0;border-radius:28px;background:#67e8f9;color:#083344;font:950 clamp(52px,18vw,100px)/1 system-ui;touch-action:none";
    const down = (e: PointerEvent) => {
      b.setPointerCapture(e.pointerId);
      move = val;
      ctx.sendInput({ move });
    };
    const up = () => {
      move = 0;
      ctx.sendInput({ move: 0 });
    };
    b.addEventListener("pointerdown", down);
    b.addEventListener("pointerup", up);
    b.addEventListener("pointercancel", up);
    controls.append(b);
    return () => {
      b.removeEventListener("pointerdown", down);
      b.removeEventListener("pointerup", up);
      b.removeEventListener("pointercancel", up);
    };
  };
  const a = mk("←", -1, "Dodge left"),
    b = mk("→", 1, "Dodge right");
  w.append(info, controls);
  root.append(w);
  const u = ctx.subscribe((m) => {
    if (ok(m.state)) {
      const me = m.state.players.find((p) => p.id === ctx.playerId);
      info.textContent = `DODGE DASH · LEVEL ${m.state.level} · ${Math.floor(me?.score ?? 0)} pts · HITS ${me?.hits ?? 0}`;
    }
  });
  return () => {
    u();
    a();
    b();
    root.replaceChildren();
  };
};
