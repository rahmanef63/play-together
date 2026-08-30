import type { IncomingMessage, ServerResponse } from "node:http";
import { verifyTemplateDownloadTicket } from "@play-together/security";
import { issueSignedToken, presignUrl } from "@vercel/blob";

export default async function templateDownload(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (request.method !== "GET") {
    response.statusCode = 405;
    response.setHeader("allow", "GET");
    response.end("Method not allowed");
    return;
  }
  try {
    const url = new URL(request.url ?? "/", "https://play-together.invalid");
    const ticket = url.searchParams.get("ticket") ?? "";
    if (ticket.length < 32 || ticket.length > 8_192) throw new Error("Invalid ticket");
    const secret = process.env.TEMPLATE_DOWNLOAD_SECRET;
    if (!secret) throw new Error("Template downloads are not configured");
    const claims = verifyTemplateDownloadTicket(ticket, secret);
    const validUntil = Math.min(claims.exp * 1_000, Date.now() + 60_000);
    if (validUntil <= Date.now()) throw new Error("Template download ticket expired");
    const signedToken = await issueSignedToken({
      pathname: claims.blobPath,
      operations: ["get"],
      validUntil,
    });
    const { presignedUrl } = await presignUrl(signedToken, {
      operation: "get",
      pathname: claims.blobPath,
      validUntil,
      access: "private",
    });
    response.statusCode = 302;
    response.setHeader("location", presignedUrl);
    response.setHeader("cache-control", "private, no-store");
    response.setHeader(
      "content-disposition",
      `attachment; filename="${safeFileName(claims.fileName)}"`,
    );
    response.setHeader("referrer-policy", "no-referrer");
    response.end();
  } catch {
    response.statusCode = 404;
    response.setHeader("cache-control", "private, no-store");
    response.setHeader("content-type", "text/plain; charset=utf-8");
    response.end("Template download unavailable");
  }
}

function safeFileName(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 160) || "template.tar.gz";
}
