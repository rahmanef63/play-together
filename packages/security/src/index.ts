import { createHmac, timingSafeEqual } from "node:crypto";
import {
  type TemplateDownloadClaims,
  type TicketClaims,
  templateDownloadClaimsSchema,
  ticketClaimsSchema,
} from "@play-together/contracts";

const HEADER = { alg: "HS256", typ: "PTT" } as const;
const TEMPLATE_DOWNLOAD_HEADER = { alg: "HS256", typ: "PTD" } as const;

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decodeJson(value: string): unknown {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function signature(input: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(input).digest();
}

export function signTicket(claims: TicketClaims, secret: string): string {
  if (Buffer.byteLength(secret) < 32) {
    throw new Error("JOIN_TICKET_SECRET must contain at least 32 bytes");
  }
  const validated = ticketClaimsSchema.parse(claims);
  const unsigned = `${encode(HEADER)}.${encode(validated)}`;
  return `${unsigned}.${signature(unsigned, secret).toString("base64url")}`;
}

export interface VerifyTicketOptions {
  nowSeconds?: number;
  clockToleranceSeconds?: number;
}

export function verifyTicket(
  token: string,
  secret: string,
  options: VerifyTicketOptions = {},
): TicketClaims {
  if (Buffer.byteLength(secret) < 32) {
    throw new Error("JOIN_TICKET_SECRET must contain at least 32 bytes");
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed ticket");
  }
  const [encodedHeader, encodedClaims, encodedSignature] = parts;
  if (!encodedHeader || !encodedClaims || !encodedSignature) {
    throw new Error("Malformed ticket");
  }
  const header = decodeJson(encodedHeader) as Record<string, unknown>;
  if (header.alg !== HEADER.alg || header.typ !== HEADER.typ) {
    throw new Error("Unsupported ticket algorithm");
  }
  const unsigned = `${encodedHeader}.${encodedClaims}`;
  const expected = signature(unsigned, secret);
  const received = Buffer.from(encodedSignature, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw new Error("Invalid ticket signature");
  }
  const claims = ticketClaimsSchema.parse(decodeJson(encodedClaims));
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const tolerance = options.clockToleranceSeconds ?? 5;
  if (claims.exp < now - tolerance) {
    throw new Error("Ticket expired");
  }
  if (claims.iat > now + tolerance) {
    throw new Error("Ticket issued in the future");
  }
  if (claims.exp - claims.iat > 15 * 60) {
    throw new Error("Ticket lifetime exceeds policy");
  }
  return claims;
}

export function verifyTemplateDownloadTicket(
  token: string,
  secret: string,
  options: VerifyTicketOptions = {},
): TemplateDownloadClaims {
  if (Buffer.byteLength(secret) < 32) {
    throw new Error("TEMPLATE_DOWNLOAD_SECRET must contain at least 32 bytes");
  }
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed template download ticket");
  const [encodedHeader, encodedClaims, encodedSignature] = parts;
  if (!encodedHeader || !encodedClaims || !encodedSignature) {
    throw new Error("Malformed template download ticket");
  }
  const header = decodeJson(encodedHeader) as Record<string, unknown>;
  if (header.alg !== TEMPLATE_DOWNLOAD_HEADER.alg || header.typ !== TEMPLATE_DOWNLOAD_HEADER.typ) {
    throw new Error("Unsupported template download ticket algorithm");
  }
  const unsigned = `${encodedHeader}.${encodedClaims}`;
  const expected = signature(unsigned, secret);
  const received = Buffer.from(encodedSignature, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw new Error("Invalid template download ticket signature");
  }
  const claims = templateDownloadClaimsSchema.parse(decodeJson(encodedClaims));
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const tolerance = options.clockToleranceSeconds ?? 5;
  if (claims.exp < now - tolerance) throw new Error("Template download ticket expired");
  if (claims.iat > now + tolerance)
    throw new Error("Template download ticket issued in the future");
  if (claims.exp - claims.iat > 5 * 60)
    throw new Error("Template download ticket lifetime exceeds policy");
  return claims;
}
