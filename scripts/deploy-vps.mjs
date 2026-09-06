import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const compose = resolve(root, "infra/vps/docker-compose.production.yml");
const envFile = process.env.VPS_ENV_FILE || resolve(root, ".env.vps.production");
if (!existsSync(envFile)) throw new Error(`Missing VPS env file: ${envFile}`);
const revisionResult = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
if (revisionResult.status !== 0) throw new Error("Could not resolve deployment revision");
const appRevision = revisionResult.stdout.trim();
if (!/^[0-9a-f]{40}$/.test(appRevision)) throw new Error("Invalid deployment revision");
const args = [
  "compose",
  "--env-file",
  envFile,
  "-f",
  compose,
  "up",
  "-d",
  "--build",
  "--remove-orphans",
  "--wait",
];
const result = spawnSync("docker", args, {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, APP_REVISION: appRevision },
});
if (result.status !== 0) process.exit(result.status ?? 1);
console.log("Play Together VPS stack is healthy.");
