import type { BrowserGameContext, DisplayGameModule } from "@play-together/game-sdk";

interface TapRaceSnapshot {
  kind: "tap-race";
  phase: "waiting" | "playing" | "finished";
  racers: Array<{ id: string; progress: number }>;
  winnerId: string | null;
  round: number;
}

export const mountDisplay: DisplayGameModule["mountDisplay"] = (
  root: HTMLElement,
  context: BrowserGameContext,
) => {
  root.replaceChildren();
  const frame = document.createElement("section");
  frame.style.cssText =
    "width:100%;height:100%;min-height:280px;display:grid;grid-template-rows:auto 1fr auto;gap:clamp(14px,3vh,28px);padding:clamp(20px,4vw,54px);background:radial-gradient(circle at 50% -20%,#343565,#101329 58%,#080a17);color:#faf9ff;overflow:auto";
  const header = document.createElement("header");
  header.style.cssText = "display:flex;align-items:end;justify-content:space-between;gap:20px";
  const title = document.createElement("div");
  title.innerHTML =
    '<span style="display:block;color:#a9a7d2;font:800 12px/1 system-ui;letter-spacing:.18em;margin-bottom:8px">SHARED SCREEN</span><strong style="font:950 clamp(34px,7vw,88px)/.9 system-ui;letter-spacing:-.07em">TAP RACE</strong>';
  const round = document.createElement("strong");
  round.style.cssText = "font:850 clamp(16px,3vw,30px)/1 ui-monospace,monospace;color:#ffcf5a";
  header.append(title, round);
  const lanes = document.createElement("section");
  lanes.style.cssText = "display:grid;align-content:center;gap:clamp(12px,2vh,22px)";
  const footer = document.createElement("p");
  footer.style.cssText =
    "margin:0;text-align:center;color:#aba9cc;font:700 clamp(13px,2vw,18px)/1.4 system-ui";
  frame.append(header, lanes, footer);
  root.append(frame);

  const render = (state: TapRaceSnapshot) => {
    round.textContent = `ROUND ${state.round}`;
    lanes.replaceChildren();
    state.racers.forEach((racer, index) => {
      const lane = document.createElement("article");
      lane.style.cssText =
        "display:grid;grid-template-columns:minmax(84px,.35fr) minmax(160px,1.65fr) auto;align-items:center;gap:clamp(10px,2vw,24px)";
      const name = document.createElement("strong");
      name.textContent = `PLAYER ${index + 1}`;
      name.style.cssText = "font:850 clamp(13px,2.2vw,24px)/1 system-ui";
      const track = document.createElement("div");
      track.style.cssText =
        "height:clamp(26px,5vh,52px);border-radius:999px;background:#292d4e;overflow:hidden;padding:4px";
      const bar = document.createElement("div");
      bar.style.cssText = `height:100%;width:${Math.max(0, Math.min(100, racer.progress))}%;border-radius:inherit;background:${index % 2 ? "linear-gradient(90deg,#ff9e7a,#ffcf5a)" : "linear-gradient(90deg,#78f2a5,#d5ff80)"};transition:width .08s linear`;
      track.append(bar);
      const score = document.createElement("strong");
      score.textContent = `${Math.round(racer.progress)}%`;
      score.style.cssText = "font:900 clamp(16px,3vw,32px)/1 ui-monospace,monospace";
      lane.append(name, track, score);
      lanes.append(lane);
    });
    if (!state.racers.length) {
      const empty = document.createElement("p");
      empty.textContent = "Waiting for a phone controller…";
      empty.style.cssText =
        "text-align:center;color:#c4c2dd;font:700 clamp(18px,3vw,34px)/1.4 system-ui";
      lanes.append(empty);
    }
    const winnerIndex = state.racers.findIndex((racer) => racer.id === state.winnerId);
    footer.textContent =
      winnerIndex >= 0
        ? `PLAYER ${winnerIndex + 1} WINS — next round starting`
        : "Tap faster than everyone else";
  };

  const unsubscribe = context.subscribe((message) => {
    if (isTapRaceSnapshot(message.state)) render(message.state);
  });
  render({ kind: "tap-race", phase: "waiting", racers: [], winnerId: null, round: 1 });
  return () => {
    unsubscribe();
    root.replaceChildren();
  };
};

function isTapRaceSnapshot(value: unknown): value is TapRaceSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { kind?: unknown; racers?: unknown };
  return candidate.kind === "tap-race" && Array.isArray(candidate.racers);
}
