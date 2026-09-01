import { pathToFileURL } from "node:url";
import { parentPort, workerData } from "node:worker_threads";
import type { CreateServerGame, ServerGame } from "@play-together/game-sdk";
import { FixedHistogram } from "../features/observability/fixed-histogram.js";
import { WORKER_TICK_MS_BOUNDS } from "../features/observability/realtime-metrics.js";

interface WorkerConfiguration {
  modulePath: string;
  context: {
    roomId: string;
    gameId: string;
    gameVersion: string;
    seed: number;
  };
  tickRate: number;
  snapshotRate: number;
}

type ParentMessage =
  | { type: "join"; playerId: string; connectedAt: number }
  | { type: "leave"; playerId: string }
  | { type: "input"; playerId: string; payload: unknown; sequence: number }
  | { type: "dispose" };

const workerPort = (() => {
  if (!parentPort) throw new Error("Game worker requires a parent port");
  return parentPort;
})();
const configuration = workerData as WorkerConfiguration;
let game: ServerGame | null = null;
let tick = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let disposed = false;
let consecutiveTickErrors = 0;
const MAX_CONSECUTIVE_TICK_ERRORS = 8;
const PERFORMANCE_REPORT_MS = 5_000;

async function main(): Promise<void> {
  const imported = (await import(pathToFileURL(configuration.modulePath).href)) as {
    createServerGame?: CreateServerGame;
  };
  if (typeof imported.createServerGame !== "function") {
    throw new Error("Game server bundle must export createServerGame");
  }
  game = await imported.createServerGame(configuration.context);
  let previous = performance.now();
  let lastSnapshot = previous;
  const tickInterval = 1000 / configuration.tickRate;
  const snapshotInterval = 1000 / configuration.snapshotRate;
  const tickPerformance = new FixedHistogram(WORKER_TICK_MS_BOUNDS);
  let lastPerformanceReport = previous;

  const runTick = async (): Promise<void> => {
    if (!game || disposed) return;
    const startedAt = performance.now();
    const delta = Math.min(100, startedAt - previous);
    previous = startedAt;
    try {
      await game.tick(Date.now(), delta);
      consecutiveTickErrors = 0;
      tick += 1;
      const completedAt = performance.now();
      if (completedAt - lastSnapshot >= snapshotInterval) {
        lastSnapshot = completedAt;
        workerPort.postMessage({
          type: "snapshot",
          tick,
          serverTime: Date.now(),
          state: game.snapshot(),
        });
      }
    } catch (error) {
      consecutiveTickErrors += 1;
      const fatal = consecutiveTickErrors >= MAX_CONSECUTIVE_TICK_ERRORS;
      workerPort.postMessage({
        type: "error",
        message: error instanceof Error ? error.message : "Game tick failed",
        fatal,
      });
      if (fatal) await dispose();
    } finally {
      if (!disposed) {
        const completedAt = performance.now();
        const elapsed = completedAt - startedAt;
        tickPerformance.observe(elapsed);
        if (completedAt - lastPerformanceReport >= PERFORMANCE_REPORT_MS) {
          const summary = tickPerformance.summary();
          workerPort.postMessage({
            type: "performance",
            performance: {
              ticks: summary.count,
              tickP50Ms: summary.p50,
              tickP95Ms: summary.p95,
              tickMaxMs: summary.max,
            },
          });
          tickPerformance.reset();
          lastPerformanceReport = completedAt;
        }
        timer = setTimeout(() => void runTick(), Math.max(0, tickInterval - elapsed));
        timer.unref();
      }
    }
  };

  timer = setTimeout(() => void runTick(), tickInterval);
  timer.unref();
  workerPort.postMessage({ type: "ready" });
}

workerPort.on("message", async (message: ParentMessage) => {
  if (!game || disposed) return;
  try {
    if (message.type === "join")
      await game.onJoin({ id: message.playerId, connectedAt: message.connectedAt });
    else if (message.type === "leave") await game.onLeave(message.playerId);
    else if (message.type === "input")
      await game.onInput(message.playerId, message.payload, message.sequence);
    else if (message.type === "dispose") await dispose();
  } catch (error) {
    workerPort.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "Game event failed",
      fatal: false,
    });
  }
});

async function dispose(): Promise<void> {
  if (disposed) return;
  disposed = true;
  if (timer) clearTimeout(timer);
  timer = null;
  await game?.dispose?.();
  workerPort.postMessage({ type: "disposed" });
  process.exit(0);
}

main().catch((error) => {
  workerPort.postMessage({
    type: "error",
    message: error instanceof Error ? error.message : "Game worker failed",
    fatal: true,
  });
  process.exit(1);
});
