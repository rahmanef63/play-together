import type { ConsoleControl } from "@play-together/contracts";
import type { Cleanup } from "./types";

export type PhysicalBindings = Map<
  string,
  { button?: (pressed: boolean) => void; axes?: (x: number, y: number) => void }
>;
// W3C Standard Gamepad: face buttons 0..3, bumpers 4/5, triggers 6/7.
export const STANDARD_BUTTONS: Readonly<Record<string, number>> = {
  a: 0,
  b: 1,
  x: 2,
  c: 2,
  y: 3,
  d: 3,
  l1: 4,
  r1: 5,
  l2: 6,
  r2: 7,
  select: 8,
  start: 9,
  pause: 9,
};
const DPAD = { up: 12, down: 13, left: 14, right: 15 } as const;
export function deadzoneAxes(rawX: number, rawY: number, deadzone = 0.16): [number, number] {
  const x = Number.isFinite(rawX) ? Math.max(-1, Math.min(1, rawX)) : 0;
  const y = Number.isFinite(rawY) ? Math.max(-1, Math.min(1, rawY)) : 0;
  const length = Math.hypot(x, y);
  if (length <= deadzone) return [0, 0];
  const magnitude = Math.min(1, (length - deadzone) / (1 - deadzone));
  return [
    Number(((x / length) * magnitude).toFixed(3)),
    Number(((y / length) * magnitude).toFixed(3)),
  ];
}
const pressed = (pad: Gamepad | null, index: number) =>
  Boolean(pad?.buttons[index]?.pressed || (pad?.buttons[index]?.value ?? 0) >= 0.5);

export function createGamepadReader(controls: ConsoleControl[], bindings: PhysicalBindings) {
  const buttons = new Map<string, boolean>();
  const axes = new Map<string, string>();
  const hasDpad = controls.some((control) => control.kind === "dpad");
  const button = (id: string, value: boolean) => {
    if ((buttons.get(id) ?? false) === value) return;
    buttons.set(id, value);
    bindings.get(id)?.button?.(value);
  };
  return {
    update(candidate: Gamepad | null) {
      // Unknown layouts must not accidentally map START to an unrelated action.
      const pad = candidate?.connected && candidate.mapping === "standard" ? candidate : null;
      for (const control of controls) {
        if (control.kind === "button" && control.face) {
          const index = STANDARD_BUTTONS[control.face];
          if (index !== undefined) button(control.id, pressed(pad, index));
        }
        if (control.kind === "dpad")
          for (const direction of Object.keys(DPAD) as (keyof typeof DPAD)[])
            button(`${control.id}:${direction}`, pressed(pad, DPAD[direction]));
        if (control.kind !== "stick") continue;
        const offset = control.zone === "right" ? 2 : 0;
        let [x, y] = deadzoneAxes(pad?.axes[offset] ?? 0, -(pad?.axes[offset + 1] ?? 0));
        if (!hasDpad && offset === 0) {
          const dx = Number(pressed(pad, 15)) - Number(pressed(pad, 14));
          const dy = Number(pressed(pad, 12)) - Number(pressed(pad, 13));
          if (dx || dy) [x, y] = [dx, dy];
        }
        const value = `${x},${y}`;
        if ((axes.get(control.id) ?? "0,0") !== value) {
          axes.set(control.id, value);
          bindings.get(control.id)?.axes?.(x, y);
        }
      }
    },
  };
}

export function mountGamepad(controls: ConsoleControl[], bindings: PhysicalBindings): Cleanup {
  if (typeof navigator.getGamepads !== "function") return () => undefined;
  const reader = createGamepadReader(controls, bindings);
  let raf = 0;
  let activeIndex: number | null = null;
  let awaitingNeutral = true;
  let focused = document.hasFocus();
  const reset = () => {
    reader.update(null);
    awaitingNeutral = true;
  };
  const blur = () => {
    focused = false;
    reset();
  };
  const focus = () => {
    focused = true;
  };
  const hidden = () => {
    if (document.hidden) reset();
  };
  const poll = () => {
    raf = requestAnimationFrame(poll);
    if (!focused || document.hidden) return;
    let pads: (Gamepad | null)[];
    try {
      pads = Array.from(navigator.getGamepads());
    } catch {
      reset();
      return;
    }
    const pad = pads.find((entry) => entry?.connected && entry.mapping === "standard") ?? null;
    if (pad?.index !== activeIndex) {
      reset();
      activeIndex = pad?.index ?? null;
    }
    if (!pad) return;
    if (awaitingNeutral) {
      if (
        pad.buttons.some((entry) => entry.pressed || entry.value >= 0.5) ||
        pad.axes.some((axis) => Math.abs(axis) > 0.16)
      )
        return;
      awaitingNeutral = false;
    }
    reader.update(pad);
  };
  window.addEventListener("blur", blur);
  window.addEventListener("focus", focus);
  document.addEventListener("visibilitychange", hidden);
  raf = requestAnimationFrame(poll);
  return () => {
    cancelAnimationFrame(raf);
    reset();
    window.removeEventListener("blur", blur);
    window.removeEventListener("focus", focus);
    document.removeEventListener("visibilitychange", hidden);
  };
}
