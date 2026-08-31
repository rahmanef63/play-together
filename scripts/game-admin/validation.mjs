const GAME_ID = /^[a-z0-9][a-z0-9-]{1,63}$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?$/;
export const CONTROL_TOKENS = new Set([
  "stick",
  "dpad",
  "touchpad",
  "a",
  "b",
  "x",
  "y",
  "l1",
  "r1",
  "l2",
  "r2",
  "start",
  "select",
]);
export const LAYOUTS = new Set(["gamepad", "arcade", "racing", "flight", "touch"]);
export const ORIENTATIONS = new Set(["portrait", "landscape", "adaptive"]);
export const MODES = new Set(["shared-screen", "handheld"]);
export const REMOTE_DISPLAY_MODES = new Set(["shared", "per-player"]);

export function requireId(value) {
  if (typeof value !== "string" || !GAME_ID.test(value))
    throw new Error("id must be a kebab-case game id (2-64 chars)");
  return value;
}
export function requireText(value, name, min, max) {
  if (typeof value !== "string") throw new Error(`${name} must be a string`);
  const text = value.trim();
  if (text.length < min || text.length > max)
    throw new Error(`${name} must be ${min}-${max} chars`);
  return text;
}
export function requireInteger(value, name, min, max) {
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`${name} must be an integer from ${min} to ${max}`);
  return value;
}
export function requireEnum(value, allowed, name) {
  if (typeof value !== "string" || !allowed.has(value))
    throw new Error(`${name} must be one of: ${[...allowed].join(", ")}`);
  return value;
}
export function normalizeControlTokens(value) {
  if (!Array.isArray(value) || value.length === 0)
    throw new Error("controls must be a non-empty array");
  const tokens = value.map((item) => requireEnum(item, CONTROL_TOKENS, "control"));
  const directional = tokens.filter((item) => ["stick", "dpad", "touchpad"].includes(item));
  if (directional.length > 1)
    throw new Error("Use at most one of stick, dpad, or touchpad in a scaffold");
  if (new Set(tokens).size !== tokens.length)
    throw new Error("controls must not contain duplicates");
  return tokens;
}
export function normalizePresentation(modeValue, maxViewportsValue, maxPlayers) {
  const mode = requireEnum(modeValue, REMOTE_DISPLAY_MODES, "remoteDisplay");
  if (mode === "shared") return { mode, maxViewports: 1 };
  if (maxPlayers < 2) throw new Error("per-player remote display requires maxPlayers >= 2");
  const fallback = Math.min(4, maxPlayers);
  const maxViewports = requireInteger(
    maxViewportsValue ?? fallback,
    "maxViewports",
    2,
    Math.min(4, Math.max(2, maxPlayers)),
  );
  return { mode, maxViewports };
}
export function normalizeModes(value) {
  if (!Array.isArray(value) || value.length === 0)
    throw new Error("modes must be a non-empty array");
  return [...new Set(value.map((item) => requireEnum(item, MODES, "mode")))];
}
export function requireSemver(value, name) {
  if (typeof value !== "string" || !SEMVER.test(value))
    throw new Error(`${name} must be semantic version x.y.z`);
  return value;
}
export function compareSemver(left, right) {
  const parse = (value) => value.split("-", 1)[0].split(".").map(Number);
  const a = parse(left);
  const b = parse(right);
  for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  return left === right ? 0 : left.includes("-") ? -1 : 1;
}
export function optionalSource(value) {
  return value === undefined ? undefined : requireSource(value, "source");
}
export function requireSource(value, name) {
  if (typeof value !== "string" || value.trim().length < 20 || value.length > 96_000)
    throw new Error(`${name} must be source text between 20 and 96000 chars`);
  return value;
}
export function ensureTrailingNewline(value) {
  return value.endsWith("\n") ? value : `${value}\n`;
}
