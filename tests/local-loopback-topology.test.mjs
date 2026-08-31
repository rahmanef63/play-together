import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("local Convex loopback topology", () => {
  it("recreates the network-namespace sidecar after the backend is finalized", async () => {
    const source = await readFile("scripts/bootstrap-local.mjs", "utf8");
    const firstInfraEnd = source.indexOf("const topologyAfter");
    const firstInfra = source.slice(0, firstInfraEnd);
    const backendRefresh = source.indexOf('[...compose, "restart", "convex-backend"]');
    const loopbackRecreate = source.indexOf('"--force-recreate"');
    const loopbackBlock = source.slice(loopbackRecreate, loopbackRecreate + 360);
    const deploy = source.indexOf("await deployConvex");

    expect(firstInfra).not.toContain('"convex-site-loopback"');
    expect(backendRefresh).toBeGreaterThan(firstInfraEnd);
    expect(loopbackRecreate).toBeGreaterThan(backendRefresh);
    expect(loopbackBlock).toContain('"--no-deps"');
    expect(loopbackBlock).toContain('"convex-site-loopback"');
    expect(loopbackRecreate).toBeLessThan(deploy);
  });
});
