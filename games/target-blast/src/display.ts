import type { DisplayGameModule } from "@play-together/game-sdk";

interface S {
  kind: "target-blast";
  round: number;
  targets: Array<{ id: number; x: number; y: number; r: number }>;
  players: Array<{ id: string; score: number; hits: number; shots: number }>;
}
const ok = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as { kind?: unknown }).kind === "target-blast";
export const mountDisplay: DisplayGameModule["mountDisplay"] = (root, ctx) => {
  root.replaceChildren();
  const w = document.createElement("section");
  w.style.cssText =
    "height:100%;min-height:320px;display:grid;grid-template-rows:auto 1fr auto;gap:12px;padding:clamp(16px,3vw,36px);background:#060a14;color:white;font-family:system-ui";
  const h = document.createElement("h1");
  h.style.cssText = "margin:0;font-size:clamp(30px,6vw,70px)";
  const arena = document.createElement("div");
  arena.style.cssText =
    "position:relative;border-radius:28px;background:radial-gradient(circle,#162c4e,#090f1f);overflow:hidden";
  const scores = document.createElement("div");
  scores.style.cssText = "display:flex;gap:10px;flex-wrap:wrap";
  w.append(h, arena, scores);
  root.append(w);
  const r = (s: S) => {
    h.textContent = `TARGET BLAST · ROUND ${s.round}`;
    arena.replaceChildren(
      ...s.targets.map((t) => {
        const e = document.createElement("span");
        e.style.cssText = `position:absolute;left:${t.x * 100}%;top:${t.y * 100}%;width:${t.r * 200}%;aspect-ratio:1;border-radius:50%;transform:translate(-50%,-50%);background:#ff4d6d;box-shadow:0 0 0 8px #fff4 inset,0 0 32px #ff4d6daa`;
        return e;
      }),
    );
    scores.replaceChildren(
      ...s.players.map((p, i) => {
        const b = document.createElement("b");
        b.textContent = `P${i + 1} ${p.score}`;
        b.style.cssText = "padding:8px 12px;border-radius:999px;background:#17213a";
        return b;
      }),
    );
  };
  const u = ctx.subscribe((m) => {
    if (ok(m.state)) r(m.state);
  });
  return () => {
    u();
    root.replaceChildren();
  };
};
