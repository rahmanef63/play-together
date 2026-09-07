import { expect, it } from "vitest";
import { checkpointGuide } from "./checkpoint.js";

it("uses the next unpassed checkpoint and switches to finish after the last", () => {
  expect(checkpointGuide(400, 0)).toBe("CP 1/7 · 20 m");
  expect(checkpointGuide(3500, 7)).toBe("FINISH 50 m");
  expect(checkpointGuide(3600, 7)).toBe("FINISH 0 m");
});
