import type { DisplayGameModule } from "@play-together/game-sdk";

interface S {
  kind: "memory-lights";
  phase: "show" | "input" | "result";
  round: number;
  sequence: number[];
  players: Array<{ id: string; score: number; progress: number }>;
  winnerId: string | null;
}
const ok = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as { kind?: unknown }).kind === "memory-lights";
const colors = ["#ef4444", "#3b82f6", "#22c55e", "#eab308"];
export const mountDisplay: DisplayGameModule["mountDisplay"] = (root, ctx) => {
  root.replaceChildren();
  const w = document.createElement("section");
  w.style.cssText =
    "height:100%;min-height:320px;padding:clamp(22px,4vw,50px);background:#0b1020;color:#fff;font-family:system-ui;display:grid;grid-template-rows:auto 1fr auto;gap:24px";
  const h = document.createElement("h1");
  h.style.cssText = "margin:0;font-size:clamp(34px,7vw,78px)";
  const seq = document.createElement("div");
  seq.style.cssText =
    "display:flex;gap:clamp(8px,2vw,20px);align-items:center;justify-content:center;flex-wrap:wrap";
  const scores = document.createElement("div");
  scores.style.cssText = "display:flex;gap:10px;flex-wrap:wrap;justify-content:center";
  w.append(h, seq, scores);
  root.append(w);
  const render = (s: S) => {
    h.textContent = `MEMORY LIGHTS · ROUND ${s.round} · ${s.phase.toUpperCase()}`;
    seq.replaceChildren(
      ...s.sequence.map((pad, i) => {
        const x = document.createElement("div");
        x.style.cssText = `width:clamp(44px,8vw,96px);aspect-ratio:1;border-radius:22px;background:${s.phase === "show" ? colors[pad] : "#252d46"};display:grid;place-items:center;font:900 22px/1 system-ui`;
        x.textContent = s.phase === "show" ? String(i + 1) : "?";
        return x;
      }),
    );
    scores.replaceChildren(
      ...s.players.map((p, i) => {
        const x = document.createElement("b");
        x.textContent = `P${i + 1} ${p.score} · ${p.progress}/${s.sequence.length}`;
        x.style.cssText = "padding:10px 14px;background:#1b2440;border-radius:999px";
        return x;
      }),
    );
  };
  const u = ctx.subscribe((m) => {
    if (ok(m.state)) render(m.state);
  });
  return () => {
    u();
    root.replaceChildren();
  };
};
