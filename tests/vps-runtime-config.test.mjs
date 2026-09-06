import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("VPS production runtime configuration", () => {
  it("routes the canonical host through Dokploy Traefik without host port publishing", async () => {
    const compose = await readFile("infra/vps/docker-compose.production.yml", "utf8");
    const hostExpression = "$" + "{VPS_HOST:-game.rahmanef.com}";
    expect(compose).toContain(`Host(\`${hostExpression}\`) && PathPrefix(\`/api/realtime\`)`);
    expect(compose).toContain(`Host(\`${hostExpression}\`)`);
    expect(compose).toContain("traefik.http.routers.play-together-realtime.priority=100");
    expect(compose).toContain("redirect-to-https@file");
    expect(compose).toContain(
      "traefik.http.routers.play-together-web.tls.certresolver=letsencrypt",
    );
    expect(compose).toContain(
      "traefik.http.routers.play-together-realtime.tls.certresolver=letsencrypt",
    );
    expect(compose).toContain("dokploy-network:");
    expect(compose).toContain("external: true");
    expect(compose).not.toMatch(/^\s*ports:/m);
  });

  it("keeps Convex managed and reuses the proven external Redis during the initial cutover", async () => {
    const compose = await readFile("infra/vps/docker-compose.production.yml", "utf8");
    expect(compose).toContain("VITE_CONVEX_URL:");
    expect(compose).not.toContain("convex-backend:");
    expect(compose).not.toContain("  redis:");
    expect(compose).toContain("REDIS_URL: $" + "{REDIS_URL:?");
    expect(compose).toContain('REQUIRE_DISTRIBUTED_COORDINATION: "true"');
    expect(compose).toContain("REALTIME_CONNECT_PATH: /api/realtime");
    expect(compose).toContain(
      "MODULE_CACHE_DIR: $" + "{MODULE_CACHE_DIR:-/tmp/play-together/game-modules}",
    );
    expect(compose).toContain("TICKET_VERIFIER_CONVEX_URL: $" + "{VITE_CONVEX_URL:?");
    expect(compose).toContain("JOIN_TICKET_SECRET: $" + "{JOIN_TICKET_SECRET:-}");
  });

  it("does not require production HMAC signing secrets on the VPS profile", async () => {
    const profile = await readFile(".env.vps.production.example", "utf8");
    expect(profile).toContain("TICKET_VERIFIER_CONVEX_URL=https://upbeat-dog-398.convex.cloud");
    expect(profile).not.toMatch(/^JOIN_TICKET_SECRET=/m);
    expect(profile).not.toMatch(/^TEMPLATE_DOWNLOAD_SECRET=/m);
  });

  it("uses one platform-neutral production artifact path for Vercel rollback and VPS images", async () => {
    const rootPackage = JSON.parse(await readFile("package.json", "utf8"));
    const webDockerfile = await readFile("apps/web/Dockerfile", "utf8");
    const vercelAdapter = await readFile("scripts/prepare-vercel-output.mjs", "utf8");
    const productionOutput = await readFile("scripts/prepare-production-output.mjs", "utf8");
    expect(rootPackage.scripts["vercel:build"]).toBe("pnpm production:build");
    expect(rootPackage.scripts["production:web:build"]).toContain("prepare-production-output.mjs");
    expect(webDockerfile).toContain("RUN pnpm production:web:build");
    expect(vercelAdapter).toContain('import "./prepare-production-output.mjs"');
    expect(productionOutput).toContain('resolve(releaseRoot, "games")');
  });

  it("keeps GitHub as a gate while the VPS performs the Convex and container deployment", async () => {
    const workflow = await readFile(".github/workflows/ci.yml", "utf8");
    const deployer = await readFile("scripts/ci-gated-vps-deploy.mjs", "utf8");
    const prepareJob = workflow.slice(
      workflow.indexOf("  prepare-production:"),
      workflow.indexOf("  verify-production:"),
    );
    expect(prepareJob).toContain("Validate Convex production sources");
    expect(prepareJob).not.toContain("CONVEX_DEPLOY_KEY");
    expect(prepareJob).not.toContain("RESEND_API_KEY");
    expect(prepareJob).not.toContain("convex deploy");
    expect(deployer).toContain('"convex",');
    expect(deployer).toContain('"deploy",');
    expect(deployer).toContain('"--typecheck",');
    expect(deployer).toContain('"enable",');
    expect(deployer).toContain('"pnpm", "install", "--frozen-lockfile"');
    expect(deployer).toContain('"--filter=@play-together/security"');
  });
});
