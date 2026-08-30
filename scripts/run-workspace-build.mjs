import { spawnSync } from "node:child_process";

const env = {
  ...process.env,
  VITE_CONVEX_URL: process.env.VITE_CONVEX_URL || "https://build-verification.invalid",
  VITE_REALTIME_URL:
    process.env.VITE_REALTIME_URL || "wss://build-verification.invalid/api/realtime",
};
const result = spawnSync("pnpm", ["exec", "turbo", "run", "build"], {
  cwd: process.cwd(),
  env,
  encoding: "utf8",
  stdio: "inherit",
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
