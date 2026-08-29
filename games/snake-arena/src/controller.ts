import type { ControllerGameModule } from "@play-together/game-sdk";

interface S {
  kind: "snake-arena";
  players: Array<{ id: string; score: number; crashes: number }>;
  round: number;
}
const ok = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as { kind?: unknown }).kind === "snake-arena";
export const mountController: ControllerGameModule["mountController"] = (root, ctx) => {
  root.replaceChildren();
  const w = document.createElement("section");
  w.style.cssText =
    "height:100%;display:grid;grid-template-rows:auto 1fr;gap:12px;padding:12px;background:#07140a;color:#fff";
  const info = document.createElement("strong");
  info.style.cssText = "font:800 17px system-ui";
  const pad = document.createElement("div");
  pad.style.cssText =
    "align-self:center;justify-self:center;display:grid;grid-template-columns:repeat(3,minmax(70px,110px));grid-template-rows:repeat(3,minmax(70px,110px));gap:8px";
  const specs = [
    ["↑", 0, -1, "Move snake up", 1],
    ["←", -1, 0, "Move snake left", 3],
    ["↓", 0, 1, "Move snake down", 7],
    ["→", 1, 0, "Move snake right", 5],
  ] as const;
  const clean: Array<() => void> = [];
  for (const [label, x, y, name, cell] of specs) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.setAttribute("aria-label", name);
    b.style.cssText = `grid-area:${Math.floor(cell / 3) + 1}/${(cell % 3) + 1};border:0;border-radius:22px;background:#4ade80;color:#052e16;font:950 44px/1 system-ui;touch-action:manipulation`;
    const send = () => {
      ctx.sendInput({ dir: { x, y } });
      navigator.vibrate?.(5);
    };
    b.addEventListener("pointerdown", send);
    clean.push(() => b.removeEventListener("pointerdown", send));
    pad.append(b);
  }
  w.append(info, pad);
  root.append(w);
  const keys = (e: KeyboardEvent) => {
    const map: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      w: [0, -1],
      s: [0, 1],
      a: [-1, 0],
      d: [1, 0],
    };
    const d = map[e.key];
    if (d) ctx.sendInput({ dir: { x: d[0], y: d[1] } });
  };
  window.addEventListener("keydown", keys);
  const u = ctx.subscribe((m) => {
    if (ok(m.state)) {
      const me = m.state.players.find((p) => p.id === ctx.playerId);
      info.textContent = `SNAKE ARENA · SCORE ${me?.score ?? 0} · CRASHES ${me?.crashes ?? 0}`;
    }
  });
  return () => {
    u();
    for (const dispose of clean) dispose();
    window.removeEventListener("keydown", keys);
    root.replaceChildren();
  };
};
