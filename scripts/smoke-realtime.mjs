import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import WebSocket from "ws";
import { createGateway } from "../apps/realtime/dist/index.js";
import { signTicket } from "../packages/security/dist/index.js";

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
const gateway = createGateway({
  host: "127.0.0.1",
  port: 0,
  ticketSecret: secret,
  allowedOrigins: new Set(["http://localhost:4173"]),
  moduleOrigins: new Set([`http://127.0.0.1:${cdnPort}`]),
  moduleOriginMap: new Map(),
  allowInsecureModuleOrigins: true,
  moduleCacheDirectory: resolve(".cache/smoke-game-modules"),
  allowMissingOrigin: false,
  roomIdleTimeoutMs: 50,
  maxPayloadBytes: 65_536,
});
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
const endpoint = `ws://127.0.0.1:${address.port}/v1/connect`;
const display = new WebSocket(endpoint, ["play-together.v1", `ptt.${displayTicket}`], {
  origin: "http://localhost:4173",
});
const controller = new WebSocket(endpoint, ["play-together.v1", `ptt.${controllerTicket}`], {
  origin: "http://localhost:4173",
});
try {
  await Promise.all([waitForType(display, "welcome"), waitForType(controller, "welcome")]);
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
  console.log(
    "Realtime smoke: controller → isolated game worker → shared display + ticket expiry OK",
  );
} finally {
  display.close();
  controller.close();
  await gateway.close();
  cdn.kill("SIGTERM");
}

async function waitForUrl(url) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Game CDN did not start");
}

function waitForType(socket, type) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${type}`));
    }, 5_000);
    const onMessage = (data) => {
      const message = JSON.parse(data.toString());
      if (message.type !== type) return;
      cleanup();
      resolve(message);
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      clearTimeout(timeout);
      socket.off("message", onMessage);
      socket.off("error", onError);
    };
    socket.on("message", onMessage);
    socket.on("error", onError);
  });
}

function expectUnauthorized(socket) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Replayed ticket was not rejected")), 5_000);
    socket.once("unexpected-response", (_request, response) => {
      clearTimeout(timeout);
      response.resume();
      if (response.statusCode !== 401)
        reject(new Error(`Expected 401, received ${response.statusCode}`));
      else resolve();
    });
    socket.once("open", () => {
      clearTimeout(timeout);
      socket.close();
      reject(new Error("Replayed ticket opened a socket"));
    });
    socket.once("error", () => undefined);
  });
}

function expectClosed(socket, expectedCode) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error(`Socket was not closed with ${expectedCode} after ticket expiry`));
    }, 5_000);
    socket.once("close", (code) => {
      clearTimeout(timeout);
      if (code !== expectedCode)
        reject(new Error(`Expected close ${expectedCode}, received ${code}`));
      else resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}
