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
    expect(migrated).toContain(
      'GAME_MODULE_FETCH_ORIGIN_MAP="{\\"http://localhost:8081\\":\\"http://game-cdn:8080\\"}"',
    );
  });
});
