import { spawnSync } from "node:child_process";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

const root = process.cwd();
const repository = process.env.VPS_GITHUB_REPOSITORY || "rahmanef63/play-together";
const envFile =
  process.env.VPS_ENV_FILE || join(homedir(), ".config/play-together/vps-production.env");
const stateFile =
  process.env.VPS_DEPLOY_STATE_FILE || join(homedir(), ".local/state/play-together/deployed-sha");
const stateDirectory = dirname(stateFile);
const convexEnvironmentFile = join(stateDirectory, "convex-production.env");
const requiredJobs = ["verify", "integration", "prepare-production"];

run("git", ["fetch", "--quiet", "origin", "main"]);
const target = output("git", ["rev-parse", "origin/main"]);
if (!/^[0-9a-f]{40}$/.test(target)) throw new Error("Invalid origin/main revision");
const deployed = await readOptional(stateFile);
if (deployed.trim() === target) {
  console.log(`VPS already runs ${target.slice(0, 12)}.`);
  process.exit(0);
}

const runs = await githubJson(
  `https://api.github.com/repos/${repository}/actions/runs?head_sha=${target}&event=push&per_page=10`,
);
const runRecord = (runs.workflow_runs || []).find(
  (item) => item.name === "CI" && item.head_branch === "main" && item.head_sha === target,
);
if (!runRecord) {
  console.log(`No CI push run exists yet for ${target.slice(0, 12)}.`);
  process.exit(0);
}
const jobs = await githubJson(
  `https://api.github.com/repos/${repository}/actions/runs/${runRecord.id}/jobs?per_page=100`,
);
const byName = new Map((jobs.jobs || []).map((job) => [job.name, job]));
for (const name of requiredJobs) {
  const job = byName.get(name);
  if (job?.status !== "completed" || job.conclusion !== "success") {
    console.log(`CI gate ${name} is not successful yet for ${target.slice(0, 12)}.`);
    process.exit(0);
  }
}

const convexUrl = await readEnvironmentValue(envFile, "VITE_CONVEX_URL");
const convexDeployment = convexDeploymentFromUrl(convexUrl);
await mkdir(stateDirectory, { recursive: true });
await writeFile(convexEnvironmentFile, `CONVEX_DEPLOYMENT=prod:${convexDeployment}\n`, {
  mode: 0o600,
});
await chmod(convexEnvironmentFile, 0o600);

run("git", ["reset", "--hard", target]);
run("git", ["clean", "-fdx"]);
run("corepack", ["pnpm", "install", "--frozen-lockfile", "--prefer-offline"]);
run("corepack", ["pnpm", "--filter", "@play-together/contracts", "build"]);
run("corepack", [
  "pnpm",
  "exec",
  "convex",
  "deploy",
  "--env-file",
  convexEnvironmentFile,
  "--typecheck",
  "enable",
  "--message",
  target,
]);
run(process.execPath, [resolve(root, "scripts/deploy-vps.mjs")], {
  ...process.env,
  VPS_ENV_FILE: envFile,
});
await writeFile(stateFile, `${target}\n`, { mode: 0o600 });
console.log(`VPS deployed CI-approved revision ${target}.`);

async function githubJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "play-together-vps-deployer",
      "x-github-api-version": "2022-11-28",
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`GitHub API request failed (${response.status})`);
  return response.json();
}

async function readOptional(path) {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

async function readEnvironmentValue(path, name) {
  const content = await readFile(path, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1 || line.slice(0, separator).trim() !== name) continue;
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) return value;
  }
  throw new Error(`${name} is missing from the VPS environment file`);
}

function convexDeploymentFromUrl(value) {
  const url = new URL(value);
  const suffix = ".convex.cloud";
  if (url.protocol !== "https:" || !url.hostname.endsWith(suffix)) {
    throw new Error("VITE_CONVEX_URL must be a managed Convex Cloud URL");
  }
  const deployment = url.hostname.slice(0, -suffix.length);
  if (!/^[a-z0-9-]+$/.test(deployment)) throw new Error("Invalid Convex deployment name");
  return deployment;
}

function output(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${command} failed`);
  return result.stdout.trim();
}

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
