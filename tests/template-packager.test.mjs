import { spawnSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const slug = `packager-smoke-${process.pid}`;
const sourceRoot = resolve("template-sources", slug);
const source = resolve(sourceRoot, "source");
const packagePrefix = resolve(".local/template-packages", `${slug}-0.0.1`);

afterAll(async () => {
  await rm(sourceRoot, { recursive: true, force: true });
  await rm(`${packagePrefix}.tar.gz`, { force: true });
  await rm(`${packagePrefix}.json`, { force: true });
});

describe("private template packager", () => {
  it("packages source but rejects environment files", async () => {
    await mkdir(resolve(source, "src"), { recursive: true });
    await writeFile(
      resolve(sourceRoot, "template.json"),
      JSON.stringify({
        slug,
        version: "0.0.1",
        title: "Packager Smoke",
        summary: "CI-only private source packaging validation.",
        previewGameId: "pong",
        previewGameVersion: "0.3.0",
        priceMinor: 100,
        currency: "USD",
        licenseId: "commercial-test",
      }),
    );
    await writeFile(resolve(source, "src/index.ts"), "export const safe = true;\n");

    const good = spawnSync(process.execPath, ["scripts/package-game-template.mjs", slug], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    expect(good.status).toBe(0);

    await writeFile(resolve(source, ".env"), "SECRET_SHOULD_NEVER_SHIP=1\n");
    const bad = spawnSync(process.execPath, ["scripts/package-game-template.mjs", slug], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    expect(bad.status).not.toBe(0);
    expect(`${bad.stdout}\n${bad.stderr}`).toContain("Unsafe template file: .env");
  });
});
