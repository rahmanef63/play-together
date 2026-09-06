import { templateDownloadClaimsSchema } from "@play-together/contracts";
import { verifyTemplateDownloadTicket } from "@play-together/security";
import { issueSignedToken, presignUrl } from "@vercel/blob";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

const remoteVerifyTemplate = makeFunctionReference("gatewayTickets:verifyTemplateDownload");
const convexClients = new Map();

export async function templateDownload(request, response) {
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
    const claims = await verifyTemplateTicket(ticket);
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

export async function verifyTemplateTicket(ticket) {
  const convexUrl = process.env.TICKET_VERIFIER_CONVEX_URL?.trim();
  if (convexUrl) {
    const timeoutMs = verifierTimeoutMs();
    const cacheKey = `${convexUrl}|${timeoutMs}`;
    let client = convexClients.get(cacheKey);
    if (!client) {
      client = new ConvexHttpClient(convexUrl, {
        logger: false,
        fetch: timeoutFetch(timeoutMs),
      });
      convexClients.set(cacheKey, client);
    }
    return templateDownloadClaimsSchema.parse(
      await client.action(remoteVerifyTemplate, { ticket }),
    );
  }
  const secrets = [process.env.TEMPLATE_DOWNLOAD_SECRET, process.env.TEMPLATE_DOWNLOAD_SECRET_NEXT]
    .map((value) => value?.trim())
    .filter((value, index, values) => value && values.indexOf(value) === index);
  if (secrets.length === 0) throw new Error("Template downloads are not configured");
  return verifyTemplateTicketWithRotation(ticket, secrets);
}

function safeFileName(value) {
  return value.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 160) || "template.tar.gz";
}

function verifyTemplateTicketWithRotation(ticket, secrets) {
  let lastError;
  for (const secret of secrets) {
    try {
      return verifyTemplateDownloadTicket(ticket, secret);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Template ticket signature invalid");
}

function verifierTimeoutMs() {
  const value = Number(process.env.TICKET_VERIFIER_TIMEOUT_MS ?? 5_000);
  return Number.isFinite(value) && value >= 500 && value <= 15_000 ? value : 5_000;
}

function timeoutFetch(timeoutMs) {
  return (input, init = {}) => {
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    return fetch(input, { ...init, signal });
  };
}
