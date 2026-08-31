import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("local Convex bootstrap ordering", () => {
  it("re-syncs function environment after deploy before game publication", async () => {
    const source = await readFile("scripts/bootstrap-local.mjs", "utf8");
    const helperStart = source.indexOf("async function deployConvex");
    const helperEnd = source.indexOf("async function writeSelfHostedEnv", helperStart);
    const helper = source.slice(helperStart, helperEnd);
    const syncCalls = [...helper.matchAll(/scripts\/sync-convex-env\.mjs/g)].map(
      (match) => match.index ?? -1,
    );
    const deploy = helper.indexOf('"convex", "deploy"');
    const publish = source.indexOf("scripts/publish-to-convex.mjs");

    expect(syncCalls).toHaveLength(2);
    expect(syncCalls[0]).toBeLessThan(deploy);
    expect(syncCalls[1]).toBeGreaterThan(deploy);
    expect(source.indexOf("await deployConvex")).toBeLessThan(publish);
  });
});
