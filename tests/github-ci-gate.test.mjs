import { describe, expect, it } from "vitest";
import { parseHtmlJob, readGithubCiGate } from "../scripts/github-ci-gate.mjs";

const jobBlock = (name, body, concluded = "false") => `
<streaming-graph-job data-concluded="${concluded}" data-job-id="${name}">
  ${body}
</streaming-graph-job>`;

describe("GitHub CI gate fallback", () => {
  it("parses success, running, queued and failed HTML jobs", () => {
    expect(
      parseHtmlJob(
        jobBlock("verify", '<svg aria-label="completed successfully: verify">', "true"),
        "verify",
      ),
    ).toEqual({ status: "completed", conclusion: "success" });
    expect(
      parseHtmlJob(
        jobBlock("integration", '<svg aria-label="currently running: integration">'),
        "integration",
      ),
    ).toEqual({ status: "in_progress", conclusion: null });
    expect(parseHtmlJob(jobBlock("prepare-production", ""), "prepare-production")).toEqual({
      status: "queued",
      conclusion: null,
    });
    expect(
      parseHtmlJob(jobBlock("verify", '<svg aria-label="failed: verify">', "true"), "verify"),
    ).toEqual({ status: "completed", conclusion: "failure" });
    expect(
      parseHtmlJob(
        jobBlock("prepare-production", '<svg aria-label="skipped: prepare-production">', "true"),
        "prepare-production",
      ),
    ).toEqual({ status: "completed", conclusion: "failure" });
  });

  it("falls back from rate-limited REST to exact-commit check HTML", async () => {
    const repository = "rahmanef63/play-together";
    const target = "b".repeat(40);
    const runId = 12345;
    const requiredJobs = ["verify", "integration", "prepare-production"];
    const runHtml = requiredJobs
      .map((name) => jobBlock(name, `<svg aria-label="completed successfully: ${name}">`, "true"))
      .join("\n");
    const fetchImpl = async (url) => {
      if (String(url).includes("api.github.com"))
        return new Response("rate limited", { status: 403 });
      if (String(url).endsWith(`/commit/${target}/checks`)) {
        return new Response(`<a href="/${repository}/actions/runs/${runId}">CI</a>`, {
          status: 200,
        });
      }
      if (String(url).endsWith(`/actions/runs/${runId}`))
        return new Response(runHtml, { status: 200 });
      return new Response("not found", { status: 404 });
    };
    const gate = await readGithubCiGate({ repository, target, requiredJobs, fetchImpl });
    expect(gate.source).toBe("html");
    expect(gate.runId).toBe(runId);
    for (const name of requiredJobs) {
      expect(gate.jobs.get(name)).toEqual({ status: "completed", conclusion: "success" });
    }
  });
});
