const DEFAULT_HEADERS = {
  accept: "text/html,application/xhtml+xml,application/vnd.github+json",
  "user-agent": "play-together-vps-deployer",
};

export async function readGithubCiGate({ repository, target, requiredJobs, fetchImpl = fetch }) {
  const api = await readApiGate({ repository, target, requiredJobs, fetchImpl }).catch(() => null);
  if (api) return api;
  return readHtmlGate({ repository, target, requiredJobs, fetchImpl });
}

async function readApiGate({ repository, target, requiredJobs, fetchImpl }) {
  const runs = await githubJson(
    `https://api.github.com/repos/${repository}/actions/runs?head_sha=${target}&event=push&per_page=10`,
    fetchImpl,
  );
  if (!runs) return null;
  const run = (runs.workflow_runs || []).find(
    (item) => item.name === "CI" && item.head_branch === "main" && item.head_sha === target,
  );
  if (!run) return { runId: null, jobs: new Map(), source: "api" };
  const payload = await githubJson(
    `https://api.github.com/repos/${repository}/actions/runs/${run.id}/jobs?per_page=100`,
    fetchImpl,
  );
  if (!payload) return null;
  return {
    runId: run.id,
    jobs: new Map(
      (payload.jobs || [])
        .filter((job) => requiredJobs.includes(job.name))
        .map((job) => [job.name, { status: job.status, conclusion: job.conclusion }]),
    ),
    source: "api",
  };
}

async function readHtmlGate({ repository, target, requiredJobs, fetchImpl }) {
  const checks = await githubText(
    `https://github.com/${repository}/commit/${target}/checks`,
    fetchImpl,
  );
  const escaped = escapeRegExp(repository);
  const runIds = [...checks.matchAll(new RegExp(`/${escaped}/actions/runs/(\\d+)`, "g"))].map(
    (match) => match[1],
  );
  for (const runId of [...new Set(runIds)].reverse()) {
    const html = await githubText(
      `https://github.com/${repository}/actions/runs/${runId}`,
      fetchImpl,
    );
    if (!requiredJobs.every((name) => html.includes(`data-job-id="${name}"`))) continue;
    return {
      runId: Number(runId),
      jobs: new Map(requiredJobs.map((name) => [name, parseHtmlJob(html, name)])),
      source: "html",
    };
  }
  return { runId: null, jobs: new Map(), source: "html" };
}

export function parseHtmlJob(html, name) {
  const marker = `data-job-id="${name}"`;
  const markerAt = html.indexOf(marker);
  if (markerAt < 0) return { status: "queued", conclusion: null };
  const start = html.lastIndexOf("<streaming-graph-job", markerAt);
  const end = html.indexOf("</streaming-graph-job>", markerAt);
  const block = html.slice(Math.max(0, start), end < 0 ? markerAt + 1800 : end);
  if (/aria-label="completed successfully:/.test(block)) {
    return { status: "completed", conclusion: "success" };
  }
  if (/aria-label="(?:failed|cancelled|timed out|skipped):/.test(block)) {
    return { status: "completed", conclusion: "failure" };
  }
  if (/aria-label="currently running:/.test(block))
    return { status: "in_progress", conclusion: null };
  if (block.includes('data-concluded="true"'))
    return { status: "completed", conclusion: "unknown" };
  return { status: "queued", conclusion: null };
}

async function githubJson(url, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": DEFAULT_HEADERS["user-agent"],
      "x-github-api-version": "2022-11-28",
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 403 || response.status === 429) return null;
  if (!response.ok) throw new Error(`GitHub API request failed (${response.status})`);
  return response.json();
}

async function githubText(url, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: DEFAULT_HEADERS,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`GitHub HTML request failed (${response.status})`);
  return response.text();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
