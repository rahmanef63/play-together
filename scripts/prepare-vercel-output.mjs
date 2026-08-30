import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const releaseRoot = resolve(root, "releases/game-cdn");
const webOutput = resolve(root, "apps/web/dist");
const gamesOutput = resolve(webOutput, "games");

await rm(gamesOutput, { recursive: true, force: true });
await mkdir(webOutput, { recursive: true });
await cp(resolve(releaseRoot, "games"), gamesOutput, { recursive: true });
await cp(resolve(releaseRoot, "catalog.json"), resolve(gamesOutput, "catalog.json"));
console.log("Prepared immutable game CDN under apps/web/dist/games");
