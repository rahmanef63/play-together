import type { DisplayGameModule } from "@play-together/game-sdk";

interface S {
  kind: "reaction-rush";
  phase: "armed" | "go" | "result";
  round: number;
  winnerId: string | null;
  players: Array<{ id: string; score: number; falseStarts: number }>;
}
const isS = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as { kind?: unknown }).kind === "reaction-rush";
export const mountDisplay: DisplayGameModule["mountDisplay"] = (root, ctx) => {
  root.replaceChildren();
  const wrap = document.createElement("section");
  wrap.style.cssText =
    "height:100%;min-height:320px;display:grid;grid-template-rows:auto 1fr auto;padding:clamp(24px,5vw,60px);background:#0f1014;color:#fff;font-family:system-ui";
  const title = document.createElement("h1");
  title.textContent = "REACTION RUSH";
  title.style.cssText = "margin:0;font-size:clamp(32px,7vw,84px);letter-spacing:-.06em";
  const signal = document.createElement("div");
  signal.style.cssText =
    "align-self:center;justify-self:center;width:min(44vh,44vw);aspect-ratio:1;border-radius:50%;display:grid;place-items:center;font:950 clamp(40px,10vw,120px)/1 system-ui";
  const scores = document.createElement("div");
  scores.style.cssText = "display:flex;flex-wrap:wrap;gap:12px;justify-content:center";
  wrap.append(title, signal, scores);
  root.append(wrap);
  const render = (s: S) => {
    signal.textContent =
      s.phase === "go" ? "GO" : s.phase === "armed" ? "WAIT" : s.winnerId ? "LOCKED" : "MISS";
    signal.style.background =
      s.phase === "go" ? "#57e389" : s.phase === "armed" ? "#d94f4f" : "#43434c";
    scores.replaceChildren(
      ...s.players.map((p, i) => {
        const e = document.createElement("strong");
        e.textContent = `P${i + 1}  ${p.score}`;
        e.style.cssText = "padding:10px 14px;border-radius:999px;background:#24262e";
        return e;
      }),
    );
  };
  const u = ctx.subscribe((m) => {
    if (isS(m.state)) render(m.state);
  });
  render({ kind: "reaction-rush", phase: "armed", round: 1, winnerId: null, players: [] });
  return () => {
    u();
    root.replaceChildren();
  };
};
