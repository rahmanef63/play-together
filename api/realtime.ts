import { resolve } from "node:path";
import { loadConfig } from "../apps/realtime/src/config.js";
import { createGateway } from "../apps/realtime/src/index.js";

const environment: NodeJS.ProcessEnv = {
  ...process.env,
  HOST: "0.0.0.0",
  PORT: process.env.PORT ?? "3000",
  REALTIME_CONNECT_PATH: "/api/realtime",
  MODULE_CACHE_DIR: process.env.MODULE_CACHE_DIR ?? "/tmp/play-together-game-modules",
  GAME_WORKER_PATH:
    process.env.GAME_WORKER_PATH ?? resolve(process.cwd(), "apps/realtime/dist/game-worker.js"),
  REQUIRE_DISTRIBUTED_COORDINATION:
    process.env.VERCEL === "1" ? "true" : process.env.REQUIRE_DISTRIBUTED_COORDINATION,
};

const gateway = createGateway(loadConfig(environment));

export default gateway.server;
