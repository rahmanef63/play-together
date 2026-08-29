import type { DisplayGameModule } from "@play-together/game-sdk";

interface S {
  kind: "stack-tower";
  round: number;
  players: Array<{
    id: string;
    height: number;
    width: number;
    baseX: number;
    cursor: number;
    wins: number;
  }>;
}
const ok = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as { kind?: unknown }).kind === "stack-tower";
export const mountDisplay: DisplayGameModule["mountDisplay"] = (root, ctx) => {
  root.replaceChildren();
  const w = document.createElement("section");
  w.style.cssText =
    "height:100%;min-height:320px;padding:clamp(18px,4vw,48px);background:#07140f;color:white;font-family:system-ui;display:grid;grid-template-rows:auto 1fr";
  const h = document.createElement("h1");
  h.style.cssText = "margin:0;font-size:clamp(34px,7vw,80px)";
  const lanes = document.createElement("div");
  lanes.style.cssText =
    "display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:18px;align-items:end";
  w.append(h, lanes);
  root.append(w);
  const r = (s: S) => {
    h.textContent = `STACK TOWER · ROUND ${s.round}`;
    lanes.replaceChildren(
      ...s.players.map((p, i) => {
        const lane = document.createElement("article");
        lane.style.cssText =
          "height:70vh;min-height:240px;position:relative;background:#0f2a1e;border-radius:22px;overflow:hidden";
        for (let n = 0; n < p.height; n++) {
          const b = document.createElement("span");
          b.style.cssText = `position:absolute;left:${p.baseX * 100}%;bottom:${n * 5 + 4}%;width:${Math.max(10, p.width * 100)}%;height:4.5%;background:${i % 2 ? "#60a5fa" : "#5eead4"};transform:translateX(-50%);border-radius:7px`;
          lane.append(b);
        }
        const m = document.createElement("strong");
        m.textContent = `P${i + 1} · ${p.height}/10 · W${p.wins}`;
        m.style.cssText = "position:absolute;left:12px;top:12px";
        lane.append(m);
        return lane;
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
