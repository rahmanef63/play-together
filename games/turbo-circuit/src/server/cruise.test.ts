import { describe, expect, it } from "vitest";
import { updateCruise } from "./cruise.js";
import { emptyInput, type Racer } from "./raceModel.js";

describe("one-tap cruise", () => {
  it("persists through neutral frames and stops on braking without restarting from a held gas button", () => {
    const racer = { input: emptyInput() } as Racer;
    racer.input.throttle = 1;
    updateCruise(racer, "racing", 0);
    expect(racer.cruiseActive).toBe(true);
    racer.input.throttle = 0;
    updateCruise(racer, "racing", 1);
    expect(racer.cruiseActive).toBe(true);
    racer.input.brake = 1;
    updateCruise(racer, "racing", 0);
    expect(racer.cruiseActive).toBe(false);
    racer.input.throttle = 1;
    racer.input.brake = 0;
    updateCruise(racer, "racing", 1);
    expect(racer.cruiseActive).toBe(false);
    updateCruise(racer, "racing", 0);
    expect(racer.cruiseActive).toBe(true);
    updateCruise(racer, "setup", 1);
    expect(racer.cruiseActive).toBe(false);
  });
});
