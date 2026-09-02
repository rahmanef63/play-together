import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const runtimeManifest = JSON.parse(
  await readFile(new URL("./realtime-runtime.json", import.meta.url), "utf8"),
);
const { createGateway, loadConfig } = await import(runtimeManifest.entry);

const environment = {
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
await gateway.ready();

export default gateway.server;
