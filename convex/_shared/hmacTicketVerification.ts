const encoder = new TextEncoder();
const decoder = new TextDecoder();
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

interface TicketVerificationOptions<T> {
  typ: string;
  secretName: string;
  schema: { parse(value: unknown): T };
  maxLifetimeSeconds: number;
  expiredMessage: string;
  futureMessage: string;
  lifetimeMessage: string;
}

export async function verifyHmacTicket<T>(
  token: string,
  secret: string,
  options: TicketVerificationOptions<T>,
): Promise<T> {
  if (encoder.encode(secret).byteLength < 32) {
    throw new Error(`${options.secretName} must contain at least 32 bytes`);
  }
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed ticket");
  const [encodedHeader, encodedClaims, encodedSignature] = parts;
  if (!encodedHeader || !encodedClaims || !encodedSignature) throw new Error("Malformed ticket");
  const header = decodeJson(encodedHeader) as Record<string, unknown>;
  if (header.alg !== "HS256" || header.typ !== options.typ) {
    throw new Error("Unsupported ticket algorithm");
  }
  const unsigned = `${encodedHeader}.${encodedClaims}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    decodeBase64Url(encodedSignature),
    encoder.encode(unsigned),
  );
  if (!valid) throw new Error("Invalid ticket signature");
  const claims = options.schema.parse(decodeJson(encodedClaims)) as T & {
    iat: number;
    exp: number;
  };
  const now = Math.floor(Date.now() / 1000);
  const tolerance = 5;
  if (claims.exp < now - tolerance) throw new Error(options.expiredMessage);
  if (claims.iat > now + tolerance) throw new Error(options.futureMessage);
  if (claims.exp - claims.iat > options.maxLifetimeSeconds)
    throw new Error(options.lifetimeMessage);
  return claims;
}

function decodeJson(value: string): unknown {
  return JSON.parse(decoder.decode(decodeBase64Url(value)));
}

function decodeBase64Url(value: string): ArrayBuffer {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const character of normalized) {
    if (character === "=") break;
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("Malformed ticket encoding");
    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
      buffer &= bits === 0 ? 0 : (1 << bits) - 1;
    }
  }
  return new Uint8Array(bytes).buffer;
}
