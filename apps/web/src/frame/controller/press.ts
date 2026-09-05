import { bindKeys } from "./keyboard";
import type { Cleanup } from "./types";

export function createPressLatch(change: (pressed: boolean) => void) {
  const sources = new Set<string>();
  return {
    set(source: string, pressed: boolean) {
      const before = sources.size > 0;
      if (pressed) sources.add(source);
      else sources.delete(source);
      const after = sources.size > 0;
      if (before !== after) change(after);
    },
    reset() {
      if (sources.size) {
        sources.clear();
        change(false);
      }
    },
  };
}

/** Keyboard, each finger and the physical pad share one edge-triggered action. */
export function bindPress(
  button: HTMLButtonElement,
  keys: string[],
  change: (pressed: boolean) => void,
): { setGamepad: (pressed: boolean) => void; dispose: Cleanup } {
  const latch = createPressLatch(change);
  const down = (event: PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    latch.set(`pointer:${event.pointerId}`, true);
  };
  const up = (event: PointerEvent) => latch.set(`pointer:${event.pointerId}`, false);
  const accessibleDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    latch.set("focused-key", true);
  };
  const accessibleUp = (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    latch.set("focused-key", false);
  };
  const reset = () => latch.reset();
  const hidden = () => {
    if (document.hidden) reset();
  };
  const removeKeys = bindKeys(
    keys,
    () => latch.set("keyboard", true),
    () => latch.set("keyboard", false),
  );
  button.addEventListener("pointerdown", down);
  button.addEventListener("pointerup", up);
  button.addEventListener("pointercancel", up);
  button.addEventListener("lostpointercapture", up);
  button.addEventListener("keydown", accessibleDown);
  button.addEventListener("keyup", accessibleUp);
  button.addEventListener("blur", reset);
  window.addEventListener("blur", reset);
  document.addEventListener("visibilitychange", hidden);
  return {
    setGamepad: (pressed) => latch.set("gamepad", pressed),
    dispose: () => {
      reset();
      removeKeys();
      button.removeEventListener("pointerdown", down);
      button.removeEventListener("pointerup", up);
      button.removeEventListener("pointercancel", up);
      button.removeEventListener("lostpointercapture", up);
      button.removeEventListener("keydown", accessibleDown);
      button.removeEventListener("keyup", accessibleUp);
      button.removeEventListener("blur", reset);
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", hidden);
    },
  };
}
