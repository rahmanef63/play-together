import type { CreateServerGame, ServerGame, ServerPlayer } from "@play-together/game-sdk";

interface P {
  id: string;
  team: 0 | 1;
  taps: number;
}
interface S {
  kind: "tug-war";
  phase: "playing" | "result";
  rope: number;
  round: number;
  teamWins: [number, number];
  winnerTeam: 0 | 1 | null;
  players: P[];
  countdownMs: number;
}
class TugWar implements ServerGame {
  readonly #s: S = {
    kind: "tug-war",
    phase: "playing",
    rope: 0,
    round: 1,
    teamWins: [0, 0],
    winnerTeam: null,
    players: [],
    countdownMs: 0,
  };
  readonly #seq = new Map<string, number>();
  onJoin(p: ServerPlayer) {
    if (this.#s.players.some((x) => x.id === p.id) || this.#s.players.length >= 8) return;
    const a = this.#s.players.filter((x) => x.team === 0).length,
      b = this.#s.players.filter((x) => x.team === 1).length;
    this.#s.players.push({ id: p.id, team: a <= b ? 0 : 1, taps: 0 });
  }
  onLeave(id: string) {
    this.#s.players = this.#s.players.filter((p) => p.id !== id);
    this.#seq.delete(id);
  }
  onInput(id: string, p: unknown, q: number) {
    if (
      this.#s.phase !== "playing" ||
      typeof p !== "object" ||
      p === null ||
      (p as { action?: unknown }).action !== "pull"
    )
      return;
    const last = this.#seq.get(id) ?? -1;
    if (q <= last) return;
    this.#seq.set(id, q);
    const player = this.#s.players.find((x) => x.id === id);
    if (!player) return;
    player.taps++;
    this.#s.rope += player.team === 0 ? -1 : 1;
    if (Math.abs(this.#s.rope) >= 18) {
      const t = (this.#s.rope > 0 ? 1 : 0) as 0 | 1;
      this.#s.teamWins[t]++;
      this.#s.winnerTeam = t;
      this.#s.phase = "result";
      this.#s.countdownMs = 1800;
    }
  }
  tick(_n: number, d: number) {
    if (this.#s.phase !== "result") return;
    this.#s.countdownMs -= Math.min(250, Math.max(0, d));
    if (this.#s.countdownMs <= 0) {
      this.#s.phase = "playing";
      this.#s.rope = 0;
      this.#s.winnerTeam = null;
      this.#s.round++;
      for (const p of this.#s.players) p.taps = 0;
      this.#seq.clear();
    }
  }
  snapshot() {
    return structuredClone(this.#s);
  }
}
export const createServerGame: CreateServerGame = () => new TugWar();
