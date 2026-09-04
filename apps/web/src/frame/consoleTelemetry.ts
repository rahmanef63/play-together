import type { GameManifest, SnapshotMessage } from "@play-together/contracts";
import type { BrowserGameContext } from "@play-together/game-sdk";

interface Metric {
  label: string;
  value: string;
  priority: number;
}

interface MapPoint {
  x: number;
  z: number;
  own: boolean;
}

interface TelemetryMap {
  route: Array<{ x: number; z: number }>;
  actors: MapPoint[];
}

export interface ConsoleTelemetrySummary {
  phase: string;
  detail: string;
  metrics: Metric[];
  map?: TelemetryMap;
}

const ENTITY_COLLECTIONS = ["racers", "aircraft", "planes", "players", "vehicles", "cars"] as const;

export function mountConsoleTelemetry(
  root: HTMLElement,
  manifest: GameManifest,
  context: BrowserGameContext,
): () => void {
  root.replaceChildren();

  const header = document.createElement("header");
  header.className = "console-telemetry__header";
  const copy = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = manifest.game.title;
  const phase = document.createElement("span");
  phase.textContent = "WAITING";
  copy.append(title, phase);
  const detail = document.createElement("small");
  detail.textContent = "Waiting for game status";
  header.append(copy, detail);

  const body = document.createElement("div");
  body.className = "console-telemetry__body";
  const map = document.createElement("div");
  map.className = "console-telemetry__map";
  map.setAttribute("aria-label", "Game map or radar");
  const metrics = document.createElement("div");
  metrics.className = "console-telemetry__metrics";
  body.append(map, metrics);
  root.append(header, body);

  let latest: SnapshotMessage | null = null;
  let frame = 0;
  const render = () => {
    frame = 0;
    if (!latest) return;
    const summary = summarizeConsoleTelemetry(latest, context.playerId);
    phase.textContent = summary.phase;
    detail.textContent = summary.detail;
    renderMetrics(metrics, summary.metrics);
    renderMap(map, summary.map);
  };
  const unsubscribe = context.subscribe((snapshot) => {
    latest = snapshot;
    if (!frame) frame = requestAnimationFrame(render);
  });

  return () => {
    unsubscribe();
    if (frame) cancelAnimationFrame(frame);
    root.replaceChildren();
  };
}

export function summarizeConsoleTelemetry(
  snapshot: SnapshotMessage,
  playerId: string,
): ConsoleTelemetrySummary {
  const state = asRecord(snapshot.state) ?? {};
  const collection = findEntityCollection(state);
  const player = collection?.items.find((item) => stringValue(item.id) === playerId);
  const metrics: Metric[] = [];
  const add = (label: string, value: string | undefined, priority: number) => {
    if (!value || metrics.some((metric) => metric.label === label)) return;
    metrics.push({ label, value, priority });
  };

  if (player && collection) {
    const explicitRank = numberValue(player.position) ?? numberValue(player.rank);
    const rank = explicitRank ?? deriveRank(collection.items, playerId);
    if (rank) add("POS", `${rank}/${collection.items.length}`, 100);

    const lap = numberValue(player.lap);
    const lapsToWin = numberValue(state.lapsToWin);
    if (lap !== undefined && lapsToWin !== undefined) {
      const visibleLap = booleanValue(player.finished)
        ? lapsToWin
        : Math.min(lapsToWin, Math.max(1, lap + 1));
      add("LAP", `${visibleLap}/${lapsToWin}`, 98);
    }

    const airspeed = numberValue(player.airspeed);
    const speed = airspeed ?? numberValue(player.speed);
    if (speed !== undefined) add(airspeed !== undefined ? "AIRSPD" : "SPEED", integer(speed), 96);

    const hp = numberValue(player.hp) ?? numberValue(player.health);
    if (hp !== undefined) add("HP", integer(hp), 94);
    const score = numberValue(player.score);
    if (score !== undefined) add("SCORE", integer(score), 90);
    const kills = numberValue(player.kills);
    if (kills !== undefined) add("KILLS", integer(kills), 88);
    const deaths = numberValue(player.deaths);
    if (deaths !== undefined) add("DEATHS", integer(deaths), 74);
    const coins = numberValue(player.coins);
    if (coins !== undefined) add("COINS", integer(coins), 82);

    const item = itemLabel(player.item);
    if (item) add("ITEM", item, 86);

    const checkpoint = numberValue(player.nextCheckpoint);
    const checkpointCount = checkpointTotal(state);
    if (checkpoint !== undefined && checkpointCount) {
      add("CP", `${Math.min(checkpoint + 1, checkpointCount)}/${checkpointCount}`, 80);
    }

    const altitude = numberValue(player.y);
    if (altitude !== undefined && ("airspeed" in player || collection.key === "planes")) {
      add("ALT", integer(altitude), 84);
    }
    const verticalSpeed = numberValue(player.verticalSpeed);
    if (verticalSpeed !== undefined) add("CLIMB", signedInteger(verticalSpeed), 76);

    const throttle = numberValue(player.throttle);
    if (throttle !== undefined) add("THR", `${Math.round(clamp01(throttle) * 100)}%`, 70);
    if (typeof player.gearDown === "boolean") add("GEAR", player.gearDown ? "DOWN" : "UP", 66);
    if (typeof player.flaps === "boolean") add("FLAPS", player.flaps ? "ON" : "OFF", 64);
  }

  const round = numberValue(state.round);
  if (round !== undefined) add("ROUND", integer(round), 78);

  metrics.sort((left, right) => right.priority - left.priority);
  const phase = statusLabel(state, player);
  const detail = detailLabel(state, player, collection?.key);
  const map = buildTelemetryMap(state, collection?.items ?? [], playerId);
  return { phase, detail, metrics: metrics.slice(0, 8), ...(map ? { map } : {}) };
}

function renderMetrics(root: HTMLElement, metrics: Metric[]) {
  if (!metrics.length) {
    const empty = document.createElement("span");
    empty.className = "console-telemetry__empty";
    empty.textContent = "Live status will appear here";
    root.replaceChildren(empty);
    return;
  }
  root.replaceChildren(
    ...metrics.map((metric, index) => {
      const item = document.createElement("div");
      item.className = `console-telemetry__metric${index === 0 ? " console-telemetry__metric--primary" : ""}`;
      const label = document.createElement("span");
      label.textContent = metric.label;
      const value = document.createElement("strong");
      value.textContent = metric.value;
      item.append(label, value);
      return item;
    }),
  );
}

function renderMap(root: HTMLElement, map: TelemetryMap | undefined) {
  if (!map || (!map.route.length && !map.actors.length)) {
    root.replaceChildren();
    root.hidden = true;
    return;
  }
  root.hidden = false;
  const all = [...map.route, ...map.actors];
  const xs = all.map((point) => point.x);
  const zs = all.map((point) => point.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const spanX = Math.max(1, maxX - minX);
  const spanZ = Math.max(1, maxZ - minZ);
  const project = (point: { x: number; z: number }) => ({
    x: 8 + ((point.x - minX) / spanX) * 104,
    y: 72 - ((point.z - minZ) / spanZ) * 64,
  });
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 120 80");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Live map");
  if (map.route.length > 1) {
    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute(
      "points",
      map.route
        .map((point) => {
          const projected = project(point);
          return `${projected.x.toFixed(1)},${projected.y.toFixed(1)}`;
        })
        .join(" "),
    );
    polyline.setAttribute("class", "console-telemetry__route");
    svg.append(polyline);
  }
  for (const actor of map.actors) {
    const projected = project(actor);
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    marker.setAttribute("cx", projected.x.toFixed(1));
    marker.setAttribute("cy", projected.y.toFixed(1));
    marker.setAttribute("r", actor.own ? "4" : "2.5");
    marker.setAttribute(
      "class",
      actor.own
        ? "console-telemetry__actor console-telemetry__actor--own"
        : "console-telemetry__actor",
    );
    svg.append(marker);
  }
  root.replaceChildren(svg);
}

function findEntityCollection(state: Record<string, unknown>) {
  for (const key of ENTITY_COLLECTIONS) {
    const items = recordArray(state[key]);
    if (items.length) return { key, items };
  }
  return undefined;
}

function deriveRank(items: Record<string, unknown>[], playerId: string): number | undefined {
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

function statusLabel(state: Record<string, unknown>, player?: Record<string, unknown>): string {
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

function detailLabel(
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

function buildTelemetryMap(
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

function checkpointTotal(state: Record<string, unknown>): number {
  const track = asRecord(state.track);
  return recordArray(track?.checkpoints ?? state.checkpoints).length;
}

function itemLabel(value: unknown): string | undefined {
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

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function booleanValue(value: unknown): boolean {
  return value === true;
}

function integer(value: number): string {
  return `${Math.round(Math.abs(value))}`;
}

function signedInteger(value: number): string {
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
