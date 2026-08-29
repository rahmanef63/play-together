import type { DisplayGameModule } from "@play-together/game-sdk";

interface S {
  kind: "rhythm-pulse";
  beat: number;
  phase: number;
  bpm: number;
  players: Array<{ id: string; score: number; combo: number }>;
}
const ok = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as { kind?: unknown }).kind === "rhythm-pulse";
export const mountDisplay: DisplayGameModule["mountDisplay"] = (root, ctx) => {
  root.replaceChildren();
  const w = document.createElement("section");
  w.style.cssText =
    "height:100%;min-height:320px;display:grid;grid-template-rows:auto 1fr auto;padding:clamp(20px,4vw,48px);background:radial-gradient(circle at 50% 50%,#32104b,#100719 65%);color:white;font-family:system-ui";
  const h = document.createElement("h1");
  h.style.cssText = "margin:0;font-size:clamp(34px,7vw,80px)";
  const pulse = document.createElement("div");
  pulse.textContent = "●";
  pulse.style.cssText =
    "align-self:center;justify-self:center;color:#e879f9;font-size:min(42vh,42vw);line-height:1;transition:transform .05s linear;filter:drop-shadow(0 0 32px #d946ef)";
  const s = document.createElement("div");
  s.style.cssText = "display:flex;justify-content:center;gap:10px;flex-wrap:wrap";
  w.append(h, pulse, s);
  root.append(w);
  const r = (x: S) => {
    h.textContent = `RHYTHM PULSE · ${x.bpm} BPM`;
    const d = Math.min(x.phase, 1 - x.phase);
    pulse.style.transform = `scale(${1 + Math.max(0, 1 - d * 4) * 0.3})`;
    s.replaceChildren(
      ...x.players.map((p, i) => {
        const b = document.createElement("b");
        b.textContent = `P${i + 1} ${p.score} · x${p.combo}`;
        b.style.cssText = "padding:9px 13px;background:#351348;border-radius:999px";
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
