import { expect, it } from "vitest";
import { keyboardLegend } from "./keyboardLegend";

it("formats aliases from metadata and collapses left/right modifier duplicates", () => {
  expect(
    keyboardLegend({ kind: "button", keys: ["KeyJ", "ShiftLeft", "ShiftRight"] } as never),
  ).toBe("J / Shift");
  expect(keyboardLegend({ kind: "stick", keys: { up: ["KeyW", "ArrowUp"] } } as never)).toBe(
    "W / Up",
  );
  expect(keyboardLegend({ kind: "touchpad" } as never)).toBe("");
});
