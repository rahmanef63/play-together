import { execFileSync } from "node:child_process";

const upstreamUrl =
  process.env.PLAY_TOGETHER_UPSTREAM || "https://github.com/rahmanef63/play-together.git";
const branch = process.env.PLAY_TOGETHER_UPSTREAM_BRANCH || "main";
const dryRun = process.argv.includes("--dry-run");

assertCleanWorktree();
ensureUpstream(upstreamUrl);
run("git", ["fetch", "--quiet", "upstream", branch]);

const local = output("git", ["rev-parse", "HEAD"]);
const target = output("git", ["rev-parse", "upstream/" + branch]);
if (local === target) {
  console.log("Already up to date at " + target.slice(0, 12) + ".");
  process.exit(0);
}
if (!isAncestor(local, target)) {
  throw new Error(
    "Local history diverges from upstream/" +
      branch +
      ". Review and merge manually; no files were changed.",
  );
}
if (dryRun) {
  console.log("Fast-forward available: " + local.slice(0, 12) + " → " + target.slice(0, 12) + ".");
  process.exit(0);
}
run("git", ["merge", "--ff-only", "upstream/" + branch]);
console.log("Updated to upstream/" + branch + " at " + target.slice(0, 12) + ".");

function assertCleanWorktree() {
  if (output("git", ["status", "--porcelain"]).trim()) {
    throw new Error("Worktree is not clean. Commit or stash your changes before updating.");
  }
}
function ensureUpstream(url) {
  try {
    const existing = output("git", ["remote", "get-url", "upstream"]);
    if (existing !== url)
      throw new Error(
        "Existing upstream remote is " +
          existing +
          "; set PLAY_TOGETHER_UPSTREAM explicitly to change it.",
      );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Existing upstream remote")) throw error;
    run("git", ["remote", "add", "upstream", url]);
  }
}
function isAncestor(base, target) {
  try {
    run("git", ["merge-base", "--is-ancestor", base, target]);
    return true;
  } catch {
    return false;
  }
}
function output(command, args) {
  return execFileSync(command, args, { encoding: "utf8" }).trim();
}
function run(command, args) {
  execFileSync(command, args, { stdio: "inherit" });
}
