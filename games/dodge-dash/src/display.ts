import type { DisplayGameModule } from "@play-together/game-sdk";

interface S {
  kind: "dodge-dash";
  level: number;
  players: Array<{ id: string; x: number; score: number; hits: number }>;
  hazards: Array<{ x: number; y: number; w: number }>;
}
const ok = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as { kind?: unknown }).kind === "dodge-dash";
export const mountDisplay: DisplayGameModule["mountDisplay"] = (root, ctx) => {
  root.replaceChildren();
  const w = document.createElement("section");
  w.style.cssText =
    "height:100%;min-height:320px;display:grid;grid-template-rows:auto 1fr;gap:12px;padding:16px;background:#080b13;color:white;font-family:system-ui";
  const h = document.createElement("h1");
  h.style.cssText = "margin:0;font-size:clamp(28px,6vw,64px)";
  const c = document.createElement("canvas");
  c.style.cssText = "width:100%;height:100%;min-height:270px;border-radius:24px;background:#121827";
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
    x.fillStyle = "#121827";
    x.fillRect(0, 0, r.width, r.height);
    if (s) {
      x.strokeStyle = "#ffffff15";
      for (let i = 1; i < 5; i++) {
        x.beginPath();
        x.moveTo((r.width * i) / 5, 0);
        x.lineTo((r.width * i) / 5, r.height);
        x.stroke();
      }
      x.fillStyle = "#fb7185";
      for (const q of s.hazards)
        x.fillRect((q.x - q.w / 2) * r.width, q.y * r.height, q.w * r.width, 22);
      const col = ["#67e8f9", "#facc15", "#a78bfa", "#4ade80"];
      s.players.forEach((p, i) => {
        x.fillStyle = col[i] ?? "#67e8f9";
        x.fillRect(p.x * r.width - 16, r.height * 0.84 - 18, 32, 36);
      });
    }
    raf = requestAnimationFrame(loop);
  };
  const u = ctx.subscribe((m) => {
    if (ok(m.state)) {
      s = m.state;
      h.textContent = `DODGE DASH · LEVEL ${s.level} · ${s.players.map((p, i) => `P${i + 1}:${Math.floor(p.score)}`).join("  ")}`;
    }
  });
  loop();
  return () => {
    cancelAnimationFrame(raf);
    u();
    root.replaceChildren();
  };
};
