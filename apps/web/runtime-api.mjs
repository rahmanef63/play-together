import { readFile } from "node:fs/promises";
import { templateDownload } from "./template-download.mjs";

const packageVersion = await readPackageVersion();
const appRevision = process.env.APP_REVISION || "unknown";

export async function handleRuntimeApi(request, response, url, { sendHeaders, shellCsp }) {
  if (url.pathname === "/api/templates/download") {
    await templateDownload(request, response);
    return true;
  }
  if (url.pathname === "/api/health") {
    sendJson(
      request,
      response,
      {
        ok: true,
        service: "play-together",
        version: packageVersion,
        runtime: "vps-managed",
        revision: appRevision,
        readyRevision: await readReadyRevision(),
      },
      { sendHeaders, shellCsp },
    );
    return true;
  }
  if (url.pathname === "/healthz") {
    sendJson(
      request,
      response,
      { ok: true, service: "play-together-web" },
      { sendHeaders, shellCsp },
    );
    return true;
  }
  return false;
}

function sendJson(request, response, payload, { sendHeaders, shellCsp }) {
  sendHeaders(response, "application/json; charset=utf-8", "no-store", {
    isGameFrame: false,
    isPublicAsset: false,
    shellCsp,
  });
  response.writeHead(200);
  response.end(request.method === "HEAD" ? undefined : JSON.stringify(payload));
}

async function readReadyRevision() {
  try {
    const revision = (await readFile("/run/play-together/deployed-sha", "utf8")).trim();
    return /^[0-9a-f]{40}$/.test(revision) ? revision : "unknown";
  } catch {
    return "unknown";
  }
}

async function readPackageVersion() {
  for (const relative of ["../../package.json", "./package.json"]) {
    try {
      const manifest = JSON.parse(await readFile(new URL(relative, import.meta.url), "utf8"));
      if (typeof manifest.version === "string") return manifest.version;
    } catch {
      // Source checkout and runtime image keep package.json in different locations.
    }
  }
  return "unknown";
}
