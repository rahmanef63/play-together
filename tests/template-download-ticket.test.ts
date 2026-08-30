import { describe, expect, it } from "vitest";
import { signTemplateDownloadTicket } from "../convex/_shared/templateDownloadTicket";
import { verifyTemplateDownloadTicket } from "../packages/security/src/index";

const secret = "template-download-secret-longer-than-32-bytes";
const claims = {
  iss: "play-together" as const,
  aud: "play-together-template-download" as const,
  sub: "user-1",
  templateId: "template-1",
  slug: "racing-starter",
  blobPath: "templates/racing-starter/1.0.0/racing-starter-1.0.0.tar.gz",
  fileName: "racing-starter-1.0.0.tar.gz",
  iat: 100,
  exp: 220,
  jti: "download-nonce-123",
};

describe("template download tickets", () => {
  it("round-trips a Convex-signed claim through the Vercel verifier", async () => {
    const token = await signTemplateDownloadTicket(claims, secret);
    expect(verifyTemplateDownloadTicket(token, secret, { nowSeconds: 150 })).toEqual(claims);
  });

  it("rejects tampering and expiry", async () => {
    const token = await signTemplateDownloadTicket(claims, secret);
    const parts = token.split(".");
    parts[1] = Buffer.from(
      JSON.stringify({ ...claims, blobPath: "templates/other/file.tar.gz" }),
    ).toString("base64url");
    expect(() =>
      verifyTemplateDownloadTicket(parts.join("."), secret, { nowSeconds: 150 }),
    ).toThrow("Invalid template download ticket signature");
    expect(() => verifyTemplateDownloadTicket(token, secret, { nowSeconds: 300 })).toThrow(
      "Template download ticket expired",
    );
  });
});
