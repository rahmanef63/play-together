/** Shared display/input grammar. This public code is not an authentication token. */
export const DEVICE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const MAX_DEVICE_CODE_INPUT = 256;
export function parseDeviceCode(value: unknown): string | null {
  if (typeof value !== "string" || value.length > MAX_DEVICE_CODE_INPUT) return null;
  const code = value
    .normalize("NFKC")
    .replace(/[\s\u2010-\u2015\u2212\ufe58\ufe63\uff0d-]/g, "")
    .toUpperCase();
  return /^[A-HJ-NP-Z2-9]{8}$/.test(code) ? code : null;
}
export function formatDeviceCode(value: string): string {
  const code = parseDeviceCode(value);
  return code ? `${code.slice(0, 4)}-${code.slice(4)}` : value;
}
