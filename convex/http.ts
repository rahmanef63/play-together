import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);

http.route({
  path: "/healthz",
  method: "GET",
  handler: httpAction(
    async () =>
      new Response(JSON.stringify({ ok: true, service: "play-together-convex" }), {
        status: 200,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      }),
  ),
});

http.route({
  path: "/api/templates/fulfill-purchase",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.TEMPLATE_SALES_WEBHOOK_SECRET ?? "";
    if (new TextEncoder().encode(secret).byteLength < 32) {
      return json({ accepted: false }, 503);
    }
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > 16_384) return json({ accepted: false }, 413);
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 16_384) {
      return json({ accepted: false }, 413);
    }
    const signature = request.headers.get("x-play-together-signature") ?? "";
    if (!(await verifyWebhookSignature(rawBody, signature, secret))) {
      return json({ accepted: false }, 401);
    }
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return json({ accepted: false }, 400);
    }
    const parsed = parsePurchasePayload(payload);
    if (!parsed) return json({ accepted: false }, 400);
    const result = await ctx.runMutation(internal.templates.fulfillPurchaseInternal, parsed);
    if (!result.accepted) return json({ accepted: false }, 422);
    return json({ accepted: true, granted: result.granted }, 200);
  }),
});

export default http;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function parsePurchasePayload(
  value: unknown,
): { email: string; slug: string; version: string; orderRef: string } | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const email = typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
  const slug = typeof row.slug === "string" ? row.slug.trim().toLowerCase() : "";
  const version = typeof row.version === "string" ? row.version.trim() : "";
  const orderRef = typeof row.orderRef === "string" ? row.orderRef.trim() : "";
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(slug)) return null;
  if (!version || version.length > 64 || !orderRef || orderRef.length > 160) return null;
  return { email, slug, version, orderRef };
}

async function verifyWebhookSignature(
  body: string,
  providedHex: string,
  secret: string,
): Promise<boolean> {
  if (!/^[a-f0-9]{64}$/i.test(providedHex)) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(body)));
  const received = Uint8Array.from(providedHex.match(/../g) ?? [], (pair) =>
    Number.parseInt(pair, 16),
  );
  if (received.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= (expected[index] ?? 0) ^ (received[index] ?? 0);
  }
  return difference === 0;
}
