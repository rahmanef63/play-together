import type { ControllerGameModule } from "@play-together/game-sdk";

interface S {
  kind: "maze-run";
  round: number;
  players: Array<{ id: string; wins: number; steps: number }>;
}
const ok = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as { kind?: unknown }).kind === "maze-run";
export const mountController: ControllerGameModule["mountController"] = (root, ctx) => {
  root.replaceChildren();
  const w = document.createElement("section");
  w.style.cssText =
    "height:100%;display:grid;grid-template-rows:auto 1fr;gap:12px;padding:12px;background:#12100d;color:white";
  const info = document.createElement("strong");
  const pad = document.createElement("div");
  pad.style.cssText =
    "align-self:center;justify-self:center;display:grid;grid-template-columns:repeat(3,minmax(70px,105px));grid-template-rows:repeat(3,minmax(70px,105px));gap:8px";
  const spec: [
    [string, number, number, string, number],
    [string, number, number, string, number],
    [string, number, number, string, number],
    [string, number, number, string, number],
  ] = [
    ["↑", 0, -1, "Move up", 1],
    ["←", -1, 0, "Move left", 3],
    ["↓", 0, 1, "Move down", 7],
    ["→", 1, 0, "Move right", 5],
  ];
  for (const [a, x, y, n, c] of spec) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = a;
    b.setAttribute("aria-label", n);
    b.style.cssText = `grid-area:${Math.floor(c / 3) + 1}/${(c % 3) + 1};border:0;border-radius:18px;background:#fbbf24;color:#2b1b03;font:950 42px system-ui`;
    b.addEventListener("pointerdown", () => ctx.sendInput({ move: { x, y } }));
    pad.append(b);
  }
  w.append(info, pad);
  root.append(w);
  const u = ctx.subscribe((m) => {
    if (ok(m.state)) {
      const me = m.state.players.find((p) => p.id === ctx.playerId);
      info.textContent = `MAZE RUN · WINS ${me?.wins ?? 0} · STEPS ${me?.steps ?? 0}`;
    }
  });
  return () => {
    u();
    root.replaceChildren();
  };
};
