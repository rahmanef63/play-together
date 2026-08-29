import type {
  CreateServerGame,
  ServerGame,
  ServerGameContext,
  ServerPlayer,
} from "@play-together/game-sdk";

interface PongState {
  kind: "pong";
  phase: "waiting" | "playing";
  ball: { x: number; y: number; vx: number; vy: number };
  paddles: [number, number];
  score: [number, number];
  players: [string | null, string | null];
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function createRandom(seed: number): () => number {
  let value = seed >>> 0 || 0x9e3779b9;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 0xffffffff;
  };
}

class PongGame implements ServerGame {
  readonly #random: () => number;
  readonly #slots = new Map<string, 0 | 1>();
  readonly #input: [number, number] = [0, 0];
  readonly #state: PongState = {
    kind: "pong",
    phase: "waiting",
    ball: { x: 0.5, y: 0.5, vx: 0.42, vy: 0.21 },
    paddles: [0.5, 0.5],
    score: [0, 0],
    players: [null, null],
  };

  constructor(context: ServerGameContext) {
    this.#random = createRandom(context.seed);
    this.#resetBall(this.#random() > 0.5 ? 1 : -1);
  }

  onJoin(player: ServerPlayer): void {
    if (this.#slots.has(player.id)) return;
    const slot = this.#state.players[0] === null ? 0 : this.#state.players[1] === null ? 1 : null;
    if (slot === null) return;
    this.#slots.set(player.id, slot);
    this.#state.players[slot] = player.id;
    this.#state.phase = this.#slots.size > 0 ? "playing" : "waiting";
  }

  onLeave(playerId: string): void {
    const slot = this.#slots.get(playerId);
    if (slot === undefined) return;
    this.#slots.delete(playerId);
    this.#state.players[slot] = null;
    this.#input[slot] = 0;
    if (this.#slots.size === 0) {
      this.#state.phase = "waiting";
      this.#state.score = [0, 0];
      this.#state.paddles = [0.5, 0.5];
      this.#resetBall(1);
    }
  }

  onInput(playerId: string, payload: unknown): void {
    const slot = this.#slots.get(playerId);
    if (slot === undefined || typeof payload !== "object" || payload === null) return;
    const move = (payload as { move?: unknown }).move;
    if (typeof move !== "number" || !Number.isFinite(move)) return;
    this.#input[slot] = clamp(move, -1, 1);
  }

  tick(_nowMs: number, deltaMs: number): void {
    if (this.#state.phase !== "playing") return;
    const dt = Math.min(deltaMs, 50) / 1000;
    const paddleSpeed = 0.82;
    this.#state.paddles[0] = clamp(
      this.#state.paddles[0] + this.#input[0] * paddleSpeed * dt,
      0.12,
      0.88,
    );
    this.#state.paddles[1] = clamp(
      this.#state.paddles[1] + this.#input[1] * paddleSpeed * dt,
      0.12,
      0.88,
    );

    const ball = this.#state.ball;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.y < 0.03 && ball.vy < 0) {
      ball.y = 0.03;
      ball.vy *= -1;
    } else if (ball.y > 0.97 && ball.vy > 0) {
      ball.y = 0.97;
      ball.vy *= -1;
    }

    const paddleHalf = 0.14;
    const leftHit = ball.vx < 0 && ball.x <= 0.075 && ball.x >= 0.035;
    if (leftHit && Math.abs(ball.y - this.#state.paddles[0]) <= paddleHalf) {
      ball.x = 0.075;
      ball.vx = Math.abs(ball.vx) * 1.025;
      ball.vy += (ball.y - this.#state.paddles[0]) * 1.7;
    }

    const rightHit = ball.vx > 0 && ball.x >= 0.925 && ball.x <= 0.965;
    if (rightHit && Math.abs(ball.y - this.#state.paddles[1]) <= paddleHalf) {
      ball.x = 0.925;
      ball.vx = -Math.abs(ball.vx) * 1.025;
      ball.vy += (ball.y - this.#state.paddles[1]) * 1.7;
    }

    ball.vx = clamp(ball.vx, -0.9, 0.9);
    ball.vy = clamp(ball.vy, -0.72, 0.72);

    if (ball.x < -0.05) {
      this.#state.score[1] += 1;
      this.#resetBall(1);
    } else if (ball.x > 1.05) {
      this.#state.score[0] += 1;
      this.#resetBall(-1);
    }
  }

  snapshot(): PongState {
    return structuredClone(this.#state);
  }

  #resetBall(direction: 1 | -1): void {
    const angle = (this.#random() - 0.5) * 0.55;
    this.#state.ball = {
      x: 0.5,
      y: 0.5,
      vx: direction * (0.4 + this.#random() * 0.08),
      vy: angle,
    };
  }
}

export const createServerGame: CreateServerGame = (context) => new PongGame(context);
