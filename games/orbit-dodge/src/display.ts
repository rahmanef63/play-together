import type { DisplayGameModule } from "@play-together/game-sdk";

interface S {
  kind: "orbit-dodge";
  level: number;
  players: Array<{ id: string; angle: number; score: number; shield: number }>;
  meteors: Array<{ angle: number; r: number }>;
}
const ok = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as { kind?: unknown }).kind === "orbit-dodge";
export const mountDisplay: DisplayGameModule["mountDisplay"] = (root, ctx) => {
  root.replaceChildren();
  const w = document.createElement("section");
  w.style.cssText =
    "height:100%;min-height:320px;display:grid;grid-template-rows:auto 1fr;gap:10px;padding:14px;background:#030615;color:white;font-family:system-ui";
  const h = document.createElement("h1");
  h.style.cssText = "margin:0;font-size:clamp(30px,6vw,66px)";
  const c = document.createElement("canvas");
  c.style.cssText =
    "width:100%;height:100%;min-height:270px;border-radius:24px;background:radial-gradient(circle,#17214e,#050817 70%)";
  w.append(h, c);
  root.append(w);
  let s: S | null = null;
  const loop = () => {
    const d = devicePixelRatio || 1,
      r = c.getBoundingClientRect();
    c.width = Math.floor(r.width * d);
    c.height = Math.floor(r.height * d);
    const x = c.getContext("2d");
    if (!x) return;
    x.scale(d, d);
    x.fillStyle = "#050817";
    x.fillRect(0, 0, r.width, r.height);
    if (s) {
      const cx = r.width / 2,
        cy = r.height / 2,
        R = Math.min(r.width, r.height) * 0.34;
      x.strokeStyle = "#818cf866";
      x.lineWidth = 3;
      x.beginPath();
      x.arc(cx, cy, R, 0, Math.PI * 2);
      x.stroke();
      const cols = ["#67e8f9", "#fbbf24", "#fb7185", "#c084fc"];
      s.players.forEach((p, i) => {
        x.fillStyle = cols[i] ?? "#67e8f9";
        x.beginPath();
        x.arc(cx + Math.cos(p.angle) * R, cy + Math.sin(p.angle) * R, 10, 0, Math.PI * 2);
        x.fill();
      });
      x.fillStyle = "#f97316";
      for (const m of s.meteors) {
        const rr = m.r * R * 1.7;
        x.beginPath();
        x.arc(cx + Math.cos(m.angle) * rr, cy + Math.sin(m.angle) * rr, 8, 0, Math.PI * 2);
        x.fill();
      }
    }
    requestAnimationFrame(loop);
  };
  const u = ctx.subscribe((m) => {
    if (ok(m.state)) {
      s = m.state;
      h.textContent = `ORBIT DODGE · LEVEL ${s.level} · ${s.players.map((p, i) => `P${i + 1}:${Math.floor(p.score)}`).join("  ")}`;
    }
  });
  loop();
  return () => {
    u();
    root.replaceChildren();
  };
};
