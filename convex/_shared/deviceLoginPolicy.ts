import { ConvexError } from "convex/values";

export const DEVICE_LOGIN_TTL_MS = 5 * 60_000;
export const DEVICE_POLL_MS = 4_000;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function normalizeDeviceCode(value: string): string {
  const code = value.replace(/[ -]/g, "").toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) throw new ConvexError({ code: "DEVICE_CODE_INVALID" });
  return code;
}
export function randomDeviceCode(): string {
  // Reject the biased tail instead of using modulo on every byte.
  const limit = Math.floor(256 / CODE_ALPHABET.length) * CODE_ALPHABET.length;
  let code = "";
  while (code.length < 8) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    for (const byte of bytes)
      if (byte < limit && code.length < 8) code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return code;
}
export async function deviceDigest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
export function validDeviceProof(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}
export function sameDeviceProof(a: string, b: string): boolean {
  if (!validDeviceProof(a) || !validDeviceProof(b)) return false;
  let difference = 0;
  for (let i = 0; i < 64; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
export function deviceLoginState(
  record: { state: string; expiresAt: number } | null,
  now: number,
): string {
  return !record || record.expiresAt <= now ? "expired" : record.state;
}
