import { writeFile } from "node:fs/promises";
import { environmentVariables } from "./environment-manifest.mjs";

const groups = [...new Set(environmentVariables.map((item) => item.group))];
await Promise.all([
  writeFile(".env.example", render("local")),
  writeFile(".env.production.example", render("production")),
  writeFile(".env.all.example", render("all")),
  writeFile("docs/environment.md", renderDocs()),
]);
console.log(`Generated environment examples for ${environmentVariables.length} variables`);

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
            "# Complete managed-production/CI environment template.",
            "# Replace every <placeholder> in the correct platform secret store; never commit real secrets.",
            "# Browser-visible variables are explicitly prefixed VITE_.",
          ];
  const lines = [...intro, ""];
  for (const group of groups) {
    const items = environmentVariables.filter((item) => included(item.scope, target));
    const selected = items.filter((item) => item.group === group);
    if (!selected.length) continue;
    lines.push(`# ${group}`);
    for (const item of selected) {
      lines.push(`# ${item.description}`);
      const value =
        target === "local"
          ? (item.local ?? item.production)
          : target === "all"
            ? (item.production ?? item.local)
            : (item.production ?? item.local);
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
    "# Environment variables",
    "",
    "This file is generated from `scripts/environment-manifest.mjs`. Do not hand-maintain duplicate env inventories.",
    "Run `pnpm env:examples` after adding, removing, or changing an environment contract.",
    "",
    "| Variable | Scope | Secret | Source | Purpose |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const item of environmentVariables) {
    lines.push(
      `| \`${item.name}\` | ${item.scope} | ${item.secret ? "yes" : "no"} | ${escapeTable(item.source)} | ${escapeTable(item.description)} |`,
    );
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function escapeTable(value) {
  return String(value).replaceAll("|", "\\|");
}
