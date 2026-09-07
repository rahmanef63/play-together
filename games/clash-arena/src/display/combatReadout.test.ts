import { expect, it } from "vitest";
import { createFighter } from "../server/model.js";
import { combatReadout } from "./combatReadout.js";

it("reports the real surge threshold and active air combo without stale hit text", () => {
  const fighter = createFighter("p", 0);
  expect(combatReadout({ ...fighter, meter: 25 })).toBe("SURGE READY · Y");
  expect(combatReadout({ ...fighter, juggle: 2, airborne: 10 })).toBe("AIR COMBO 3 HITS");
  expect(combatReadout({ ...fighter, flash: "7 HIT" })).toBe("100 HP · 0 METER");
});
