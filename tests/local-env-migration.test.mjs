import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const temporaryRoots = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("local environment migration", () => {
  it("backfills local topology keys without replacing existing secrets or URLs", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "play-together-env-"));
    temporaryRoots.push(root);
    const existingSecret = ["existing", "secret", "must", "survive"].join("-");
    const existingPublishToken = ["existing", "publish", "token"].join("-");
    await writeFile(
      resolve(root, ".env"),
      [
        "WEB_PORT=4999",
        "GAME_CDN_PUBLIC_ORIGIN=http://localhost:8081",
        `JOIN_TICKET_SECRET=${existingSecret}`,
        `GAME_PUBLISH_TOKEN=${existingPublishToken}`,
        "CONVEX_INSTANCE_SECRET=existing-convex-secret",
        "",
      ].join("\n"),
    );

    const script = resolve(process.cwd(), "scripts/generate-local-env.mjs");
    const { stdout } = await execFileAsync(process.execPath, [script], { cwd: root });
    const migrated = await readFile(resolve(root, ".env"), "utf8");

    expect(stdout).toContain("Local environment: migrated");
    expect(migrated).toContain("WEB_PORT=4999");
    expect(migrated).toContain(`JOIN_TICKET_SECRET=${existingSecret}`);
    expect(migrated).toContain(`GAME_PUBLISH_TOKEN=${existingPublishToken}`);
    expect(migrated).toContain("CONVEX_INSTANCE_SECRET=existing-convex-secret");
    const values = readEnvironment(migrated);
    expect(JSON.parse(values.GAME_MODULE_FETCH_ORIGIN_MAP)).toEqual({
      "http://localhost:8081": "http://game-cdn:8080",
    });
  });

  it("creates a fresh env whose JSON topology values survive the runtime loader", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "play-together-env-fresh-"));
    temporaryRoots.push(root);

    const script = resolve(process.cwd(), "scripts/generate-local-env.mjs");
    const { stdout } = await execFileAsync(process.execPath, [script], { cwd: root });
    const created = await readFile(resolve(root, ".env"), "utf8");
    const values = readEnvironment(created);

    expect(stdout).toContain("Local environment: created");
    expect(JSON.parse(values.GAME_MODULE_FETCH_ORIGIN_MAP)).toEqual({
      "http://localhost:8081": "http://game-cdn:8080",
    });
    expect(values.JOIN_TICKET_SECRET).toBeTruthy();
    expect(values.GAME_PUBLISH_TOKEN).toBeTruthy();
    expect(values.CONVEX_INSTANCE_SECRET).toBeTruthy();
  });
});

function readEnvironment(content) {
  const values = {};
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}
