import type { TelemetryMap } from "./types";

const ENTITY_COLLECTIONS = ["racers", "aircraft", "planes", "players", "vehicles", "cars"] as const;

export function findEntityCollection(state: Record<string, unknown>) {
  for (const key of ENTITY_COLLECTIONS) {
    const items = recordArray(state[key]);
    if (items.length) return { key, items };
  }
  return undefined;
}

export function deriveRank(items: Record<string, unknown>[], playerId: string): number | undefined {
  if (items.length < 2)
    return items.some((item) => stringValue(item.id) === playerId) ? 1 : undefined;
  const sorted = [...items].sort((left, right) => progressScore(right) - progressScore(left));
  const index = sorted.findIndex((item) => stringValue(item.id) === playerId);
  return index >= 0 ? index + 1 : undefined;
}

function progressScore(item: Record<string, unknown>): number {
  if (booleanValue(item.finished)) {
    const finishMs = numberValue(item.finishMs) ?? 9_999_999;
    return 10_000_000_000 - finishMs;
  }
  const lap = numberValue(item.lap) ?? 0;
  const checkpoint = numberValue(item.nextCheckpoint) ?? 0;
  const score = numberValue(item.score) ?? 0;
  const kills = numberValue(item.kills) ?? 0;
  return lap * 1_000_000 + checkpoint * 10_000 + score * 10 + kills * 1_000;
}

export function statusLabel(
  state: Record<string, unknown>,
  player?: Record<string, unknown>,
): string {
  if (player) {
    if (booleanValue(player.crashed)) return "CRASHED";
    if (booleanValue(player.missionComplete)) return "COMPLETE";
    if (booleanValue(player.finished)) return "FINISHED";
    if (booleanValue(player.wrongWay)) return "WRONG WAY";
    if (booleanValue(player.stall)) return "STALL";
    const respawnMs = numberValue(player.respawnMs);
    if (respawnMs && respawnMs > 0) return "RESPAWN";
  }
  return (stringValue(state.phase) ?? stringValue(state.status) ?? "LIVE")
    .replaceAll("-", " ")
    .toUpperCase();
}

export function detailLabel(
  state: Record<string, unknown>,
  player: Record<string, unknown> | undefined,
  collectionKey: string | undefined,
): string {
  const track = asRecord(state.track);
  const trackName =
    stringValue(track?.name) ?? stringValue(track?.id) ?? stringValue(state.trackId);
  if (trackName) return trackName.replaceAll("-", " ");
  const lock = stringValue(player?.lockId);
  if (lock) return `LOCK ${lock}`;
  if (collectionKey === "aircraft") {
    const checkpoint = numberValue(player?.nextCheckpoint) ?? 0;
    const checkpoints = recordArray(state.checkpoints);
    const label = stringValue(checkpoints[checkpoint]?.label);
    if (label) return label;
  }
  const kind = stringValue(state.kind);
  return kind ? kind.replaceAll("-", " ") : "Live game status";
}

export function buildTelemetryMap(
  state: Record<string, unknown>,
  entities: Record<string, unknown>[],
  playerId: string,
): TelemetryMap | undefined {
  const track = asRecord(state.track);
  const routeSource = recordArray(track?.checkpoints ?? state.checkpoints);
  const route = routeSource.flatMap((point) => {
    const x = numberValue(point.x);
    const z = numberValue(point.z);
    return x === undefined || z === undefined ? [] : [{ x, z }];
  });
  const actors = entities.flatMap((entity) => {
    const x = numberValue(entity.x);
    const z = numberValue(entity.z);
    if (x === undefined || z === undefined) return [];
    return [{ x, z, own: stringValue(entity.id) === playerId }];
  });
  if (route.length < 2 && actors.length < 2) return undefined;
  return { route, actors };
}

export function checkpointTotal(state: Record<string, unknown>): number {
  const track = asRecord(state.track);
  return recordArray(track?.checkpoints ?? state.checkpoints).length;
}

export function itemLabel(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.replaceAll("-", " ").toUpperCase();
  const item = asRecord(value);
  const label = stringValue(item?.name) ?? stringValue(item?.type) ?? stringValue(item?.id);
  return label?.replaceAll("-", " ").toUpperCase();
}

function recordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = asRecord(item);
    return record ? [record] : [];
  });
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function booleanValue(value: unknown): boolean {
  return value === true;
}

export function integer(value: number): string {
  return `${Math.round(Math.abs(value))}`;
}

export function signedInteger(value: number): string {
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
