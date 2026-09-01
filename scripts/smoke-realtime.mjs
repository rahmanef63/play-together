import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import WebSocket from "ws";
import { createGateway } from "../apps/realtime/dist/index.js";
import { signTicket } from "../packages/security/dist/index.js";
import {
  expectClosed,
  expectUnauthorized,
  waitForType,
  waitForUrl,
} from "./smoke-realtime/helpers.mjs";

const cdnPort = 18_081 + Math.floor(Math.random() * 500);
const cdn = spawn(process.execPath, ["scripts/serve-game-cdn.mjs"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(cdnPort) },
  stdio: ["ignore", "pipe", "inherit"],
});
const pongConfig = JSON.parse(await readFile(resolve("games/pong/game.config.json"), "utf8"));
const manifestPath = resolve(
  `releases/game-cdn/games/pong/${pongConfig.game.version}/manifest.json`,
);
const manifestBytes = await readFile(manifestPath);
const manifestSha256 = createHash("sha256").update(manifestBytes).digest("hex");
const gameVersion = pongConfig.game.version;
const manifestUrl = `http://127.0.0.1:${cdnPort}/games/pong/${gameVersion}/manifest.json`;
await waitForUrl(manifestUrl);
const secret = "smoke-test-secret-with-more-than-thirty-two-bytes";
let releaseListener = null;
const releaseControl = {
  async start(listener) {
    releaseListener = listener;
  },
  async close() {},
};
const gateway = createGateway(
  {
    host: "127.0.0.1",
    port: 0,
    connectPath: "/v1/connect",
    ticketSecret: secret,
    allowedOrigins: new Set(["http://localhost:4173"]),
    moduleOrigins: new Set([`http://127.0.0.1:${cdnPort}`]),
    moduleOriginMap: new Map(),
    allowInsecureModuleOrigins: true,
    moduleCacheDirectory: resolve(".cache/smoke-game-modules"),
    allowMissingOrigin: false,
    roomIdleTimeoutMs: 50,
    maxPayloadBytes: 65_536,
    redisUrl: undefined,
    requireDistributedCoordination: false,
  },
  { releaseControl },
);
const address = await gateway.listen();
const now = Math.floor(Date.now() / 1000);
const base = {
  iss: "play-together",
  aud: "play-together-realtime",
  roomId: "smoke-room",
  roomCode: "SMOKE1",
  gameId: "pong",
  gameVersion,
  manifestUrl,
  manifestSha256,
  iat: now,
  exp: now + 600,
};
const displayTicket = signTicket(
  { ...base, sub: "host", role: "display", mode: "remote", jti: randomUUID() },
  secret,
);
const controllerTicket = signTicket(
  { ...base, sub: "player-1", role: "controller", mode: "handheld", jti: randomUUID() },
  secret,
);
const lateTicket = signTicket(
  {
    ...base,
    roomId: "late-block-room",
    roomCode: "LATEBK",
    sub: "late-display",
    role: "display",
    mode: "remote",
    jti: randomUUID(),
  },
  secret,
);
const endpoint = `ws://127.0.0.1:${address.port}/v1/connect`;
const display = new WebSocket(endpoint, ["play-together.v1", `ptt.${displayTicket}`], {
  origin: "http://localhost:4173",
});
const controller = new WebSocket(endpoint, ["play-together.v1", `ptt.${controllerTicket}`], {
  origin: "http://localhost:4173",
});
try {
  await Promise.all([waitForType(display, "welcome"), waitForType(controller, "welcome")]);
  const workerMetricsWindow = new Promise((resolve) => setTimeout(resolve, 5_200));
  const telemetryPong = waitForType(controller, "pong");
  controller.send(
    JSON.stringify({
      type: "heartbeat",
      sentAt: Date.now(),
      telemetry: { frameP95Ms: 23, frameMaxMs: 49, frameSamples: 120, rttMs: 75 },
    }),
  );
  await telemetryPong;
  await expectUnauthorized(
    new WebSocket(endpoint, ["play-together.v1", `ptt.${controllerTicket}`], {
      origin: "http://localhost:4173",
    }),
  );
  const first = await waitForType(display, "snapshot");
  controller.send(
    JSON.stringify({ type: "input", seq: 1, sentAt: Date.now(), payload: { move: 1 } }),
  );
  let changed = false;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const next = await waitForType(display, "snapshot");
    if (next.state?.paddles?.[0] > first.state?.paddles?.[0]) {
      changed = true;
      break;
    }
  }
  if (!changed) throw new Error("Controller input did not change the authoritative game snapshot");

  const expiryIssuedAt = Math.floor(Date.now() / 1000);
  const expiringTicket = signTicket(
    {
      ...base,
      roomId: "expiring-room",
      roomCode: "EXPIRE",
      sub: "expiring-display",
      role: "display",
      mode: "remote",
      jti: randomUUID(),
      iat: expiryIssuedAt,
      exp: expiryIssuedAt + 2,
    },
    secret,
  );
  const expiring = new WebSocket(endpoint, ["play-together.v1", `ptt.${expiringTicket}`], {
    origin: "http://localhost:4173",
  });
  await waitForType(expiring, "welcome");
  await expectClosed(expiring, 4001);

  await workerMetricsWindow;
  if (!releaseListener) throw new Error("Release control listener was not attached");
  const displayError = waitForType(display, "error");
  const displayClosed = expectClosed(display, 4003);
  const controllerClosed = expectClosed(controller, 4003);
  releaseListener({
    type: "release-status",
    gameId: "pong",
    version: gameVersion,
    manifestSha256,
    status: "blocked",
    changedAt: Date.now(),
  });
  const blockedError = await displayError;
  if (blockedError.code !== "RELEASE_BLOCKED")
    throw new Error("Live block did not emit RELEASE_BLOCKED");
  await Promise.all([displayClosed, controllerClosed]);

  const late = new WebSocket(endpoint, ["play-together.v1", `ptt.${lateTicket}`], {
    origin: "http://localhost:4173",
  });
  const lateError = waitForType(late, "error");
  const lateClosed = expectClosed(late, 4003);
  if ((await lateError).code !== "RELEASE_BLOCKED")
    throw new Error("Pre-block ticket connected after the release was blocked");
  await lateClosed;

  const health = await fetch(`http://127.0.0.1:${address.port}/`).then((response) =>
    response.json(),
  );
  const observability = health.observability;
  if (observability?.counters?.browserSamples < 1)
    throw new Error("Browser telemetry was not recorded");
  if (observability?.worker?.tickP95Ms?.count < 1)
    throw new Error("Worker tick telemetry was not recorded");
  if (observability?.counters?.releaseDisconnectedConnections < 2)
    throw new Error("Release revocation telemetry did not record disconnected clients");

  console.log("Realtime smoke: authoritative play + ticket expiry + live release kill-switch OK");
} finally {
  display.close();
  controller.close();
  await gateway.close();
  cdn.kill("SIGTERM");
}
