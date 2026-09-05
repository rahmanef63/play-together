import type { SnapshotMessage } from "@play-together/contracts";
import {
  asRecord,
  booleanValue,
  buildTelemetryMap,
  checkpointTotal,
  clamp01,
  deriveRank,
  detailLabel,
  findEntityCollection,
  integer,
  itemLabel,
  numberValue,
  signedInteger,
  statusLabel,
  stringValue,
} from "./snapshotFields";
import type { ConsoleTelemetrySummary, Metric } from "./types";

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
