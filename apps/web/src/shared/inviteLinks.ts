export function roomInviteUrl(origin: string, code: string, remote = false): string {
  const url = new URL(`/room/${encodeURIComponent(code)}`, origin);
  if (remote) url.searchParams.set("join", "remote");
  return url.toString();
}
export function gameInviteUrl(origin: string, gameId: string): string {
  const url = new URL("/", origin);
  url.searchParams.set("game", gameId);
  return url.toString();
}

export function parseRoomCode(input: string, origin: string): string | null {
  const value = input.trim();
  const code = value.replace(/[\s–—-]/g, "").toUpperCase();
  if (/^[A-Z0-9]{6,8}$/.test(code)) return code;
  try {
    const url = new URL(value);
    if (url.origin !== new URL(origin).origin) return null;
    return url.pathname.match(/^\/room\/([A-Z0-9]{6,8})\/?$/i)?.[1]?.toUpperCase() ?? null;
  } catch {
    return null;
  }
}
