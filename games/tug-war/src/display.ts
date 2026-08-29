import type { DisplayGameModule } from "@play-together/game-sdk";

interface S {
  kind: "tug-war";
  phase: string;
  rope: number;
  round: number;
  teamWins: [number, number];
  winnerTeam: 0 | 1 | null;
  players: Array<{ id: string; team: 0 | 1 }>;
}
const ok = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as { kind?: unknown }).kind === "tug-war";
export const mountDisplay: DisplayGameModule["mountDisplay"] = (root, ctx) => {
  root.replaceChildren();
  const w = document.createElement("section");
  w.style.cssText =
    "height:100%;min-height:320px;display:grid;grid-template-rows:auto 1fr auto;padding:clamp(24px,5vw,64px);background:#16100b;color:white;font-family:system-ui";
  const h = document.createElement("h1");
  h.style.cssText = "margin:0;font-size:clamp(36px,8vw,90px)";
  const arena = document.createElement("div");
  arena.style.cssText =
    "position:relative;align-self:center;height:90px;background:#292018;border-radius:999px;overflow:hidden";
  const center = document.createElement("div");
  center.style.cssText = "position:absolute;left:50%;top:0;bottom:0;width:4px;background:#fff5";
  const knot = document.createElement("div");
  knot.style.cssText =
    "position:absolute;top:15px;width:60px;height:60px;border-radius:50%;background:#f5b840;transform:translateX(-50%);transition:left .08s linear";
  arena.append(center, knot);
  const f = document.createElement("div");
  f.style.cssText =
    "display:flex;justify-content:space-between;font:900 clamp(20px,4vw,42px) system-ui";
  w.append(h, arena, f);
  root.append(w);
  const r = (s: S) => {
    h.textContent = `TUG WAR · ROUND ${s.round}`;
    knot.style.left = `${50 + (s.rope / 18) * 42}%`;
    f.textContent = `LEFT ${s.teamWins[0]}                                      ${s.teamWins[1]} RIGHT`;
  };
  const u = ctx.subscribe((m) => {
    if (ok(m.state)) r(m.state);
  });
  return () => {
    u();
    root.replaceChildren();
  };
};
