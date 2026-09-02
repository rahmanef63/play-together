import { writeFile } from "node:fs/promises";
import { environmentVariables } from "./environment-manifest.mjs";
import { environmentProfiles } from "./environment-platforms.mjs";

const groups = [...new Set(environmentVariables.map((item) => item.group))];
await Promise.all([
  writeFile(".env.example", render("local")),
  writeFile(".env.production.example", render("production")),
  writeFile(".env.all.example", render("all")),
  ...environmentProfiles.map((profile) => writeFile(profile.file, renderProfile(profile))),
  writeFile("docs/environment.md", renderDocs()),
]);
console.log(
  `Generated environment examples for ${environmentVariables.length} variables + ${environmentProfiles.length} platform profiles`,
);

function render(target) {
  const intro =
    target === "all"
      ? [
          "# Complete Play Together environment contract: project-set, tooling, and platform-injected values.",
          "# Replace project-owned <placeholders>; entries marked provided-by-platform are informational.",
          "# Never commit real secrets.",
        ]
      : target === "local"
        ? [
            "# Complete local/tooling environment template. Values are placeholders or safe defaults.",
            "# `pnpm env:local` generates strong local secrets and preserves existing values.",
            "# Never commit a populated .env.",
          ]
        : [
            "# Aggregate managed-production/CI reference. Do NOT paste this whole file into one platform.",
            "# Use .env.convex.production.example and .env.vercel.production.example for platform-specific setup.",
            "# Replace every <placeholder> in the correct platform secret store; never commit real secrets.",
          ];
  return renderItems(
    environmentVariables.filter((item) => included(item.scope, target)),
    intro,
    target,
  );
}

function renderProfile(profile) {
  const selected = profile.names.map((name) => requiredItem(name));
  const intro = [
    `# ${profile.label}`,
    `# Put these values in: ${profile.destination}`,
    "# Copy this file to a non-example filename, replace every required placeholder, and never commit real secrets.",
    "# IMPORTANT: never apply literal <placeholder> values to a live deployment.",
  ];
  return renderItems(selected, intro, "production");
}

function renderItems(items, intro, target) {
  const lines = [...intro, ""];
  for (const group of groups) {
    const selected = items.filter((item) => item.group === group);
    if (!selected.length) continue;
    lines.push(`# ${group}`);
    for (const item of selected) {
      lines.push(`# Source: ${item.source}`);
      lines.push(`# ${item.description}`);
      const value =
        target === "local" ? (item.local ?? item.production) : (item.production ?? item.local);
      lines.push(`${item.name}=${value ?? `<set-${item.name.toLowerCase()}>`}`);
    }
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function included(scope, target) {
  if (target === "all") return true;
  if (target === "local") return ["local", "both", "runtime", "tooling"].includes(scope);
  return ["production", "both", "runtime", "tooling", "ci"].includes(scope);
}

function renderDocs() {
  const lines = [
    "# Environment setup",
    "",
    "This file is generated from `scripts/environment-manifest.mjs` plus `scripts/environment-platforms.mjs`.",
    "Run `pnpm env:examples` after changing an environment contract or its deployment destination.",
    "",
    "## Which file goes where",
    "",
    "| File | Use | Destination |",
    "| --- | --- | --- |",
    "| `.env.example` | Local development | Local project `.env` / `pnpm env:local` |",
    "| `.env.convex.google.example` | Google OAuth only; safest activation file | Convex production deployment environment variables |",
    "| `.env.convex.production.example` | Full Convex backend/auth/email/secrets reference | Convex production deployment environment variables |",
    "| `.env.vercel.production.example` | Web/realtime managed runtime | Vercel Production environment variables |",
    "| `.env.production.example` | Aggregate production + CI reference | Do not paste wholesale into one provider |",
    "| `.env.all.example` | Complete 71-variable inventory | Documentation/reference only |",
    "",
    "## Google OAuth: production",
    "",
    "1. In Google Cloud / Google Auth Platform create an OAuth client with application type **Web application**.",
    "2. Use `https://game.rahmanef.com` as the production application origin.",
    "3. Add this exact authorized redirect URI: `https://upbeat-dog-398.convex.site/api/auth/callback/google`.",
    "4. Copy the Google **Client ID** into `AUTH_GOOGLE_ID`.",
    "5. Copy the Google **Client secret** into `AUTH_GOOGLE_SECRET`.",
    "6. Put both values in **Convex production deployment `upbeat-dog-398`**, not Vercel and never a `VITE_` variable.",
    "7. Do not set literal placeholders in Convex. Both values are capability-gated; a non-empty fake value would expose a broken Google button.",
    "",
    "For Google only, copy `.env.convex.google.example` to a private `.env.convex.google`, replace both placeholders, then apply only those two values:",
    "",
    "```bash",
    "npx convex env --deployment upbeat-dog-398 set --from-file .env.convex.google --force",
    "npx convex env --deployment upbeat-dog-398 list --names-only",
    "```",
    "",
    "`CONVEX_SITE_URL` is supplied automatically by Convex; do not manually copy it into the deployment environment.",
    "",
    "## Complete inventory",
    "",
    "| Variable | Put it in | Scope | Secret | Source | Purpose |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const item of environmentVariables) {
    lines.push(
      `| \`${item.name}\` | ${escapeTable(destinations(item))} | ${item.scope} | ${item.secret ? "yes" : "no"} | ${escapeTable(item.source)} | ${escapeTable(item.description)} |`,
    );
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function destinations(item) {
  const labels = environmentProfiles
    .filter((profile) => profile.names.includes(item.name))
    .map((profile) => profile.label);
  if (["local", "both"].includes(item.scope)) labels.push("Local .env");
  if (item.scope === "ci") labels.push("CI secret/env store");
  if (item.scope === "tooling") labels.push("Local/CI tooling");
  if (item.scope === "platform") labels.push("Injected automatically by Vercel");
  if (item.scope === "runtime" && !labels.length) labels.push("Runtime override; normally omit");
  if (!labels.length && item.scope === "production") labels.push("Production tooling/config");
  return [...new Set(labels)].join(" + ");
}

function requiredItem(name) {
  const item = environmentVariables.find((entry) => entry.name === name);
  if (!item) throw new Error(`Environment profile references unknown variable: ${name}`);
  return item;
}

function escapeTable(value) {
  return String(value).replaceAll("|", "\\|");
}
