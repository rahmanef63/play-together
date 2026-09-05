import { MAX_DEVICE_CODE_INPUT, parseDeviceCode } from "@play-together/contracts";
export type PairingInput = { code: string; error?: never } | { code?: never; error: string };
export function parsePairingInput(raw: string, origin: string): PairingInput {
  if (raw.length > MAX_DEVICE_CODE_INPUT)
    return { error: "Paste the eight-character sign-in code, not a request ID." };
  const direct = parseDeviceCode(raw);
  if (direct) return { code: direct };
  const value = raw.trim();
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.origin !== origin || url.username || url.password)
        return { error: "This QR is not from this Play Together site." };
      if (/^\/(?:embed\/)?(?:room|play)\//.test(url.pathname))
        return {
          error: "This is a room invitation, not a sign-in QR. Use Join room for game invites.",
        };
      if (
        !["/device", "/embed/device"].includes(url.pathname) ||
        url.searchParams.getAll("pair").length !== 1 ||
        url.hash
      )
        return { error: "Scan the sign-in QR shown on your other screen." };
      const code = parseDeviceCode(url.searchParams.get("pair"));
      return code ? { code } : { error: "This sign-in QR does not contain a valid code." };
    } catch {
      return { error: "This link is not a valid sign-in QR." };
    }
  }
  return {
    error:
      "Enter the eight-character sign-in code from the other screen. Spaces and dashes are accepted.",
  };
}
export function deviceReviewError(reason: unknown): string {
  const data =
    typeof reason === "object" && reason !== null
      ? (reason as { data?: { code?: unknown } }).data
      : undefined;
  if (data?.code === "UNAUTHENTICATED")
    return "Your phone session has ended. Sign in here, then review the code again.";
  if (data?.code === "RATE_LIMITED")
    return "Too many checks. Wait a minute, then try the code again.";
  if (data?.code === "DEVICE_CODE_EXPIRED")
    return "This code expired, was cancelled, or was already used. Keep the other screen open and generate a new code there.";
  if (data?.code === "DEVICE_CODE_INVALID")
    return "Check the eight-character code on your other screen.";
  return "Could not check this code. Check your connection and try again; the code has not been approved.";
}
