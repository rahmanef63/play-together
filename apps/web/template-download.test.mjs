import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTemplateTicket } from "./template-download.mjs";

const now = Math.floor(Date.now() / 1000);
const claims = {
  iss: "play-together",
  aud: "play-together-template-download",
  sub: "user-1",
  templateId: "template-1",
  slug: "starter-pack",
  blobPath: "templates/starter-pack.tar.gz",
  fileName: "starter-pack.tar.gz",
  iat: now,
  exp: now + 120,
  jti: "template-jti-remote",
};

const originalUrl = process.env.TICKET_VERIFIER_CONVEX_URL;
const originalTimeout = process.env.TICKET_VERIFIER_TIMEOUT_MS;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalUrl === undefined) delete process.env.TICKET_VERIFIER_CONVEX_URL;
  else process.env.TICKET_VERIFIER_CONVEX_URL = originalUrl;
  if (originalTimeout === undefined) delete process.env.TICKET_VERIFIER_TIMEOUT_MS;
  else process.env.TICKET_VERIFIER_TIMEOUT_MS = originalTimeout;
});

describe("template download ticket verification", () => {
  it("delegates signature verification to Convex on the VPS", async () => {
    process.env.TICKET_VERIFIER_CONVEX_URL = "https://upbeat-dog-398.convex.cloud";
    process.env.TICKET_VERIFIER_TIMEOUT_MS = "5000";
    const requests = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input, init) => {
        requests.push({ url: String(input), body: JSON.parse(String(init?.body ?? "{}")) });
        return new Response(JSON.stringify({ status: "success", value: claims, logLines: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );
    await expect(verifyTemplateTicket("opaque-template-ticket")).resolves.toEqual(claims);
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("https://upbeat-dog-398.convex.cloud/api/action");
    expect(requests[0].body).toMatchObject({ path: "gatewayTickets:verifyTemplateDownload" });
  });
});
