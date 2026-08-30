import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("PWA generated assets", () => {
  it("pins the service worker and version endpoint to the platform semantic version", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8"));
    const versionJson = JSON.parse(await readFile("apps/web/public/version.json", "utf8"));
    const worker = await readFile("apps/web/public/sw.js", "utf8");
    const template = await readFile("apps/web/public/sw.template.js", "utf8");
    expect(versionJson.version).toBe(packageJson.version);
    expect(worker).toContain(`const VERSION = "${packageJson.version}"`);
    expect(worker).not.toContain("__APP_VERSION__");
    expect(template).toContain("__APP_VERSION__");
    expect(worker).toContain("key.startsWith(OWNED_PREFIX)");
    expect(worker).toContain('event.data?.type === "SKIP_WAITING"');
  });

  it("clears only app-owned update state while preserving auth and the incoming version cache", async () => {
    const source = await readFile("apps/web/src/shared/PwaUpdateToast.tsx", "utf8");
    expect(source).toContain('const OWNED_CACHE_PREFIX = "play-together-"');
    expect(source).toContain("key.endsWith");
    expect(source).toContain("preserveVersion");
    expect(source).toContain('const OWNED_COOKIE_PREFIXES = ["pt_", "play_together_cache_"]');
    expect(source).not.toContain("localStorage.clear");
    expect(source).not.toContain("sessionStorage.clear");
    expect(source).not.toContain("convexAuth");
    expect(source).not.toContain("pt_version=");
  });

  it("publishes the canonical repo guide and prompt to the frontend", async () => {
    const repoGuide = await readFile("docs/submitting-games.md", "utf8");
    const publicGuide = await readFile("apps/web/public/docs/submitting-games.md", "utf8");
    const prompt = await readFile("apps/web/public/docs/submitting-games.prompt.txt", "utf8");
    expect(publicGuide).toBe(repoGuide);
    expect(prompt).toContain("You are adding one new multiplayer game");
    expect(prompt).toContain("game_validate");
    expect(prompt).toContain("presentation.remoteDisplay");
    expect(prompt).toContain("ctx.playerId");
    expect(prompt).toContain("deploy-managed");
  });
});
