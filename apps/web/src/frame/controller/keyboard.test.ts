import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bindDirections, bindKeys, directionVector } from "./keyboard";

let win: EventTarget;
let doc: EventTarget & { hidden: boolean };
let cleanups: (() => void)[];
function key(type: string, code: string) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { code, key: code });
  win.dispatchEvent(event);
}
beforeEach(() => {
  win = new EventTarget();
  doc = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
  cleanups = [];
});
afterEach(() => {
  for (const cleanup of cleanups) cleanup();
  vi.unstubAllGlobals();
});
describe("keyboard ownership", () => {
  it("keeps a logical button down until every alias is released", () => {
    const down = vi.fn(),
      up = vi.fn();
    cleanups.push(bindKeys(["KeyW", "ArrowUp"], down, up));
    key("keydown", "KeyW");
    key("keydown", "ArrowUp");
    key("keyup", "KeyW");
    expect(down).toHaveBeenCalledTimes(1);
    expect(up).not.toHaveBeenCalled();
    key("keyup", "ArrowUp");
    expect(up).toHaveBeenCalledTimes(1);
  });
  it("resets aliases on blur so the same key can be used again", () => {
    const down = vi.fn(),
      up = vi.fn();
    cleanups.push(bindKeys(["KeyW"], down, up));
    key("keydown", "KeyW");
    win.dispatchEvent(new Event("blur"));
    key("keydown", "KeyW");
    expect(up).toHaveBeenCalledTimes(1);
    expect(down).toHaveBeenCalledTimes(2);
  });
  it("resets hidden tabs and ignores repeated keydown events", () => {
    const down = vi.fn(),
      up = vi.fn();
    cleanups.push(bindKeys(["KeyW"], down, up));
    key("keydown", "KeyW");
    key("keydown", "KeyW");
    doc.hidden = true;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(down).toHaveBeenCalledTimes(1);
    expect(up).toHaveBeenCalledTimes(1);
  });
  it("supports intentional shared aliases such as garage up and throttle", () => {
    const first = vi.fn(),
      second = vi.fn();
    cleanups.push(bindKeys(["KeyW"], first, vi.fn()), bindKeys(["KeyW"], second, vi.fn()));
    key("keydown", "KeyW");
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });
  it("restores the opposite direction still held and neutralizes on blur", () => {
    const change = vi.fn();
    cleanups.push(bindDirections({ left: ["KeyA"], right: ["KeyD"] }, change));
    key("keydown", "KeyA");
    expect(change).toHaveBeenLastCalledWith(-1, 0);
    key("keydown", "KeyD");
    expect(change).toHaveBeenLastCalledWith(0, 0);
    key("keyup", "KeyD");
    expect(change).toHaveBeenLastCalledWith(-1, 0);
    win.dispatchEvent(new Event("blur"));
    expect(change).toHaveBeenLastCalledWith(0, 0);
  });
  it("resolves opposite and duplicate direction aliases without order dependence", () => {
    expect(directionVector(["up", "down", "left", "right"])).toEqual([0, 0]);
    expect(directionVector(["up", "up", "left"])).toEqual([-1, 1]);
  });
});
