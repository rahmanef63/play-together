import type { DisplayGameModule } from "@play-together/game-sdk";

interface S {
  kind: "snake-arena";
  width: number;
  height: number;
  food: { x: number; y: number };
  players: Array<{ id: string; body: Array<{ x: number; y: number }>; score: number }>;
  round: number;
}
const ok = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as { kind?: unknown }).kind === "snake-arena";
export const mountDisplay: DisplayGameModule["mountDisplay"] = (root, ctx) => {
  root.replaceChildren();
  const w = document.createElement("section");
  w.style.cssText =
    "height:100%;min-height:320px;display:grid;grid-template-rows:auto 1fr;gap:12px;padding:clamp(14px,3vw,32px);background:#041008;color:white;font-family:system-ui";
  const h = document.createElement("h1");
  h.style.cssText = "margin:0;font-size:clamp(28px,6vw,62px)";
  const c = document.createElement("canvas");
  c.style.cssText = "width:100%;height:100%;min-height:260px;border-radius:22px;background:#0b2413";
  w.append(h, c);
  root.append(w);
  let latest: S | null = null;
  let raf = 0;
  const draw = () => {
    const d = devicePixelRatio || 1,
      r = c.getBoundingClientRect(),
      pixelWidth = Math.max(1, Math.floor(r.width * d)),
      pixelHeight = Math.max(1, Math.floor(r.height * d));
    if (c.width !== pixelWidth) c.width = pixelWidth;
    if (c.height !== pixelHeight) c.height = pixelHeight;
    const x = c.getContext("2d");
    if (!x) return;
    x.scale(d, d);
    x.fillStyle = "#0b2413";
    x.fillRect(0, 0, r.width, r.height);
    if (latest) {
      const cw = r.width / latest.width,
        ch = r.height / latest.height;
      x.fillStyle = "#facc15";
      x.beginPath();
      x.arc(
        (latest.food.x + 0.5) * cw,
        (latest.food.y + 0.5) * ch,
        Math.min(cw, ch) * 0.32,
        0,
        Math.PI * 2,
      );
      x.fill();
      const cols = ["#4ade80", "#60a5fa", "#fb7185", "#c084fc"];
      latest.players.forEach((p, i) => {
        x.fillStyle = cols[i % cols.length] ?? "#4ade80";
        for (const b of p.body) x.fillRect(b.x * cw + 1, b.y * ch + 1, cw - 2, ch - 2);
      });
    }
    raf = requestAnimationFrame(draw);
  };
  const u = ctx.subscribe((m) => {
    if (ok(m.state)) {
      latest = m.state;
      h.textContent = `SNAKE ARENA · ROUND ${m.state.round} · ${m.state.players.map((p, i) => `P${i + 1}:${p.score}`).join("  ")}`;
    }
  });
  draw();
  return () => {
    cancelAnimationFrame(raf);
    u();
    root.replaceChildren();
  };
};
