import { spawn } from "node:child_process";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { requiresConvexNetworkRefresh } from "./local-stack/topology.mjs";

const root = process.cwd();
await run(process.execPath, ["scripts/generate-local-env.mjs"]);
const environment = await loadEnvironment(resolve(root, ".env"));
const runtime = { ...process.env, ...environment };
delete runtime.CONVEX_DEPLOYMENT;
delete runtime.CONVEX_DEPLOY_KEY;
const compose = [
  "compose",
  "-f",
  "docker-compose.yml",
  "-f",
  "docker-compose.local.yml",
  "--profile",
  "admin",
];

const topologyBefore = await readStackTopology(runtime);
const convexAdminUrl = environment.CONVEX_SELF_HOSTED_URL || environment.VITE_CONVEX_URL;

await run("pnpm", ["--filter", "@play-together/contracts", "build"], runtime);
await run("pnpm", ["game:publish"], runtime);
await run(
  "docker",
  [...compose, "up", "-d", "--build", "--wait", "convex-backend", "convex-dashboard", "game-cdn"],
  runtime,
);
const topologyAfter = await readStackTopology(runtime);
if (requiresConvexNetworkRefresh(topologyBefore, topologyAfter)) {
  await run("docker", [...compose, "restart", "convex-backend"], runtime);
}
await waitFor(`${convexAdminUrl}/version`, 120_000);
await run(
  "docker",
  [
    ...compose,
    "up",
    "-d",
    "--build",
    "--force-recreate",
    "--no-deps",
    "--wait",
    "convex-site-loopback",
  ],
  runtime,
);

const keyPath = resolve(root, ".local/convex-admin-key");
let adminKey = "";
try {
  adminKey = (await readFile(keyPath, "utf8")).trim();
} catch {}
if (!adminKey) adminKey = await createAdminKey(runtime, keyPath);
const selfHostedEnvPath = resolve(root, ".local/convex-selfhosted.env");
await writeSelfHostedEnv(selfHostedEnvPath, convexAdminUrl, adminKey);

let deployEnvironment = {
  ...runtime,
  CONVEX_SELF_HOSTED_URL: convexAdminUrl,
  CONVEX_SELF_HOSTED_ADMIN_KEY: adminKey,
};
try {
  await deployConvex(deployEnvironment, selfHostedEnvPath);
} catch {
  adminKey = await createAdminKey(runtime, keyPath);
  deployEnvironment = { ...deployEnvironment, CONVEX_SELF_HOSTED_ADMIN_KEY: adminKey };
  await writeSelfHostedEnv(selfHostedEnvPath, convexAdminUrl, adminKey);
  await deployConvex(deployEnvironment, selfHostedEnvPath);
}

await run(process.execPath, ["scripts/publish-to-convex.mjs"], deployEnvironment);
await run("docker", [...compose, "up", "-d", "--build", "--wait", "realtime", "web"], runtime);
await Promise.all([
  waitFor(`http://localhost:${environment.REALTIME_PORT}/healthz`, 120_000),
  waitFor(`http://localhost:${environment.WEB_PORT}/healthz`, 120_000),
]);
console.log(`Local stack ready at http://localhost:${environment.WEB_PORT}`);

async function deployConvex(environment, envPath) {
  await run(process.execPath, ["scripts/sync-convex-env.mjs"], environment);
  await run("pnpm", ["exec", "convex", "deploy", "--yes", "--env-file", envPath], environment);
  // Self-hosted deploy can replace action workers. Re-apply function env so the
  // newly deployed runtime sees local fetch-origin mappings before publication.
  await run(process.execPath, ["scripts/sync-convex-env.mjs"], environment);
}

async function writeSelfHostedEnv(path, deploymentUrl, adminKey) {
  await mkdir(resolve(root, ".local"), { recursive: true, mode: 0o700 });
  const content = [
    `CONVEX_SELF_HOSTED_URL=${deploymentUrl}`,
    `CONVEX_SELF_HOSTED_ADMIN_KEY=${adminKey}`,
    "",
  ].join("\n");
  await writeFile(path, content, { mode: 0o600 });
  await chmod(path, 0o600);
}

async function readStackTopology(env) {
  const [gameCdn, convexBackend] = await Promise.all(
    ["game-cdn", "convex-backend"].map((service) =>
      capture("docker", [...compose, "ps", "-q", service], env).catch(() => ""),
    ),
  );
  return { gameCdn: gameCdn.trim(), convexBackend: convexBackend.trim() };
}

async function createAdminKey(env, path) {
  const output = await capture(
    "docker",
    [...compose, "exec", "-T", "convex-backend", "./generate_admin_key.sh"],
    env,
  );
  const candidate = output
    .trim()
    .split(/\s+/)
    .filter((value) => value.length >= 32)
    .at(-1);
  if (!candidate) throw new Error("Convex did not return a usable admin key");
  await mkdir(resolve(root, ".local"), { recursive: true, mode: 0o700 });
  await writeFile(path, `${candidate}\n`, { mode: 0o600 });
  await chmod(path, 0o600);
  return candidate;
}

async function waitFor(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}

async function run(command, args, env = process.env) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0 ? resolvePromise() : reject(new Error(`${command} exited with ${code}`)),
    );
  });
}

async function capture(command, args, env = process.env) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: ["ignore", "pipe", "inherit"] });
    let output = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0 ? resolvePromise(output) : reject(new Error(`${command} exited with ${code}`)),
    );
  });
}

async function loadEnvironment(path) {
  const values = {};
  const content = await readFile(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    )
      value = value.slice(1, -1);
    values[key] = value;
  }
  return values;
}
