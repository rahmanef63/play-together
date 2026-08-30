import type { DisplayGameModule } from "@play-together/game-sdk";

interface S {
  kind: "maze-run";
  map: readonly string[];
  goal: { x: number; y: number };
  round: number;
  players: Array<{ id: string; x: number; y: number; wins: number }>;
}
const ok = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as { kind?: unknown }).kind === "maze-run";
export const mountDisplay: DisplayGameModule["mountDisplay"] = (root, ctx) => {
  root.replaceChildren();
  const w = document.createElement("section");
  w.style.cssText =
    "height:100%;min-height:320px;display:grid;grid-template-rows:auto 1fr;gap:10px;padding:14px;background:#0b0a08;color:white;font-family:system-ui";
  const h = document.createElement("h1");
  h.style.cssText = "margin:0;font-size:clamp(30px,6vw,64px)";
  const c = document.createElement("canvas");
  c.style.cssText = "width:100%;height:100%;min-height:270px;background:#1a1712;border-radius:20px";
  w.append(h, c);
  root.append(w);
  let s: S | null = null;
  let raf = 0;
  const loop = () => {
    const d = devicePixelRatio || 1,
      r = c.getBoundingClientRect(),
      pixelWidth = Math.max(1, Math.floor(r.width * d)),
      pixelHeight = Math.max(1, Math.floor(r.height * d));
    if (c.width !== pixelWidth) c.width = pixelWidth;
    if (c.height !== pixelHeight) c.height = pixelHeight;
    const x = c.getContext("2d");
    if (!x) return;
    x.scale(d, d);
    x.fillStyle = "#1a1712";
    x.fillRect(0, 0, r.width, r.height);
    if (s) {
      const rows = s.map.length,
        cols = s.map[0]?.length ?? 0,
        cell = Math.min(r.width / cols, r.height / rows),
        ox = (r.width - cell * cols) / 2,
        oy = (r.height - cell * rows) / 2;
      for (let y = 0; y < rows; y++)
        for (let q = 0; q < cols; q++)
          if (s.map[y]?.[q] === "#") {
            x.fillStyle = "#9a7b4f";
            x.fillRect(ox + q * cell, oy + y * cell, cell, cell);
          }
      x.fillStyle = "#22c55e";
      x.fillRect(ox + s.goal.x * cell, oy + s.goal.y * cell, cell, cell);
      const colsP = ["#38bdf8", "#fb7185", "#c084fc", "#facc15"];
      s.players.forEach((p, i) => {
        x.fillStyle = colsP[i] ?? "#38bdf8";
        x.beginPath();
        x.arc(ox + (p.x + 0.5) * cell, oy + (p.y + 0.5) * cell, cell * 0.32, 0, Math.PI * 2);
        x.fill();
      });
    }
    raf = requestAnimationFrame(loop);
  };
  const u = ctx.subscribe((m) => {
    if (ok(m.state)) {
      s = m.state;
      h.textContent = `MAZE RUN · ROUND ${s.round} · ${s.players.map((p, i) => `P${i + 1} W${p.wins}`).join("  ")}`;
    }
  });
  loop();
  return () => {
    cancelAnimationFrame(raf);
    u();
    root.replaceChildren();
  };
};
