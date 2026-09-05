import type { ConsoleControl } from "@play-together/contracts";
import { describe, expect, it, vi } from "vitest";
import {
  createGamepadReader,
  deadzoneAxes,
  type PhysicalBindings,
  STANDARD_BUTTONS,
} from "./gamepad";

const controls = [
  ...["a", "b", "x", "y", "l1", "r1", "l2", "r2", "start"].map((face) => ({
    id: face,
    kind: "button",
    face,
    zone: "right",
  })),
  { id: "stick", kind: "stick", zone: "left" },
] as ConsoleControl[];
function pad(): Gamepad {
  return {
    connected: true,
    index: 0,
    mapping: "standard",
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
    axes: [0, 0, 0, 0],
  } as unknown as Gamepad;
}
function fixture() {
  const bindings: PhysicalBindings = new Map();
  for (const control of controls) bindings.set(control.id, { button: vi.fn(), axes: vi.fn() });
  return { bindings, reader: createGamepadReader(controls, bindings), device: pad() };
}
describe("standard physical gamepad", () => {
  it("maps all four shoulders to their W3C indices", () => {
    expect([
      STANDARD_BUTTONS.l1,
      STANDARD_BUTTONS.r1,
      STANDARD_BUTTONS.l2,
      STANDARD_BUTTONS.r2,
    ]).toEqual([4, 5, 6, 7]);
    const { reader, bindings, device } = fixture();
    for (const face of ["l1", "r1", "l2", "r2"]) {
      const index = STANDARD_BUTTONS[face]!;
      Object.assign(device.buttons[index]!, { pressed: true, value: 1 });
      reader.update(device);
      expect(bindings.get(face)?.button).toHaveBeenLastCalledWith(true);
    }
  });
  it("only sends button edges and neutralizes on disconnection", () => {
    const { reader, bindings, device } = fixture();
    Object.assign(device.buttons[0]!, { pressed: true, value: 1 });
    reader.update(device);
    reader.update(device);
    expect(bindings.get("a")?.button).toHaveBeenCalledTimes(1);
    reader.update(null);
    expect(bindings.get("a")?.button).toHaveBeenLastCalledWith(false);
  });
  it("does not guess button meanings on unknown gamepad mappings", () => {
    const { reader, bindings, device } = fixture();
    Object.assign(device, { mapping: "" });
    Object.assign(device.buttons[9]!, { pressed: true, value: 1 });
    reader.update(device);
    expect(bindings.get("start")?.button).not.toHaveBeenCalled();
  });
  it("normalizes axes, inverts vertical orientation, and falls back to D-pad", () => {
    const { reader, bindings, device } = fixture();
    Object.assign(device, { axes: [0, -1, 0, 0] });
    reader.update(device);
    expect(bindings.get("stick")?.axes).toHaveBeenLastCalledWith(0, 1);
    Object.assign(device.buttons[14]!, { pressed: true, value: 1 });
    reader.update(device);
    expect(bindings.get("stick")?.axes).toHaveBeenLastCalledWith(-1, 0);
    reader.update(null);
    expect(bindings.get("stick")?.axes).toHaveBeenLastCalledWith(0, 0);
  });
  it("filters noise and invalid hardware axis values", () => {
    expect(deadzoneAxes(0.08, -0.03)).toEqual([0, 0]);
    expect(deadzoneAxes(Number.NaN, Number.POSITIVE_INFINITY)).toEqual([0, 0]);
    const diagonal = deadzoneAxes(1, 1);
    expect(Math.hypot(...diagonal)).toBeCloseTo(1, 2);
  });
  it("treats trigger values as digital presses at the documented threshold", () => {
    const { reader, bindings, device } = fixture();
    Object.assign(device.buttons[7]!, { value: 0.4 });
    reader.update(device);
    expect(bindings.get("r2")?.button).not.toHaveBeenCalled();
    Object.assign(device.buttons[7]!, { value: 0.7 });
    reader.update(device);
    expect(bindings.get("r2")?.button).toHaveBeenLastCalledWith(true);
  });
});
