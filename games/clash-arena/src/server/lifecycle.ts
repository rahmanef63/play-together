import { createFighter, emptyInput, type State } from "./model.js";
export function syncBot(s: State): void {
  const humans = s.fighters.filter((f) => !f.bot);
  if (humans.length === 1 && !s.fighters.some((f) => f.bot))
    s.fighters.push(createFighter("orbit-bot", humans[0]?.side === 0 ? 1 : 0, true));
}
export function resetRound(s: State): void {
  if (s.fighters.some((f) => f.wins >= 2)) {
    s.phase = "match-over";
    s.event = "MATCH OVER — START REMATCH";
    return;
  }
  s.round++;
  s.phase = "fight";
  s.timerMs = 60000;
  s.winnerId = null;
  for (const f of s.fighters) {
    const fresh = createFighter(f.id, f.side, f.bot);
    fresh.wins = f.wins;
    Object.assign(f, fresh);
  }
  s.event = `ROUND ${s.round}`;
}
export function rematch(s: State): void {
  s.round = 1;
  s.phase = "fight";
  s.timerMs = 60000;
  s.winnerId = null;
  for (const f of s.fighters) {
    const fresh = createFighter(f.id, f.side, f.bot);
    Object.assign(f, fresh);
  }
  s.event = "REMATCH";
}
export function start(s: State): void {
  if (s.fighters.length >= 2 && s.phase === "lobby") {
    s.phase = "fight";
    s.event = "FIGHT";
  }
}
export { emptyInput };
