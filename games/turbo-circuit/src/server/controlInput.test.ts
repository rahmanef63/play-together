import { describe, expect, it } from "vitest";
import { DEFAULT_CAR } from "../shared/catalog.js";
import { applyControlPatch } from "./controlInput.js";
import { emptyInput, type Racer } from "./raceModel.js";

function racer(): Racer {
  return {
    id: "p",
    name: "P",
    bot: false,
    carId: DEFAULT_CAR.id,
    ready: false,
    cameraMode: "chase",
    rearView: false,
    x: 0,
    z: 0,
    heading: 0,
    speed: 0,
    lap: 0,
    nextCheckpoint: 0,
    finished: false,
    finishMs: null,
    steering: 0,
    coins: 0,
    item: null,
    boostTimer: 0,
    driftTime: 0,
    driftTier: 0,
    drifting: false,
    draftTimer: 0,
    drafting: false,
    spinTimer: 0,
    invulnerableTimer: 0,
    rescueCooldown: 0,
    scraping: false,
    wrongWay: false,
    wrongWayTimer: 0,
    menuXActive: false,
    menuYActive: false,
    input: emptyInput(),
  };
}

describe("Turbo Circuit control validation", () => {
  it("rejects malformed and non-finite numeric patches without changing input", () => {
    const driver = racer();
    expect(applyControlPatch(driver, { throttle: 0.7 })).toBeNull();
    const accepted = { ...driver.input };
    expect(applyControlPatch(driver, { throttle: Number.NaN })).toBeNull();
    expect(driver.input).toEqual(accepted);
    expect(applyControlPatch(driver, { steer: Infinity })).toBeNull();
    expect(driver.input).toEqual(accepted);
    expect(applyControlPatch(driver, { brake: "hard" })).toBeNull();
    expect(driver.input).toEqual(accepted);
  });
});
