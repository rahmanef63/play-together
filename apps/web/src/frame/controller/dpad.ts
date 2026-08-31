import type { ConsoleControl } from "@play-together/contracts";
import type { BrowserGameContext } from "@play-together/game-sdk";
import { bindKeys, runAction } from "./actions";
import type { Cleanup, MutableState } from "./types";

export function mountDpad(
  zone: HTMLElement,
  control: Extract<ConsoleControl, { kind: "dpad" }>,
  state: MutableState,
  context: BrowserGameContext,
): Cleanup {
  const pad = document.createElement("div");
  pad.className = "console-control console-control--dpad";
  pad.dataset.controlId = control.id;
  pad.setAttribute("role", "group");
  pad.setAttribute("aria-label", control.ariaLabel);
  const cleanups: Cleanup[] = [];
  const meta = {
    up: { label: "▲", aria: "up" },
    down: { label: "▼", aria: "down" },
    left: { label: "◀", aria: "left" },
    right: { label: "▶", aria: "right" },
  } as const;

  for (const direction of ["up", "down", "left", "right"] as const) {
    const spec = control.directions[direction];
    if (!spec) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `console-dpad__button console-dpad__button--${direction}`;
    button.textContent = meta[direction].label;
    button.setAttribute("aria-label", `${control.ariaLabel} ${meta[direction].aria}`);
    const down = (event?: PointerEvent) => {
      if (event) button.setPointerCapture(event.pointerId);
      runAction(spec.press, state, context);
      button.dataset.active = "true";
    };
    const up = () => {
      if (spec.release) runAction(spec.release, state, context);
      delete button.dataset.active;
    };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
    const removeKeys = bindKeys(spec.keys ?? [], down, up);
    cleanups.push(() => {
      removeKeys();
      button.removeEventListener("pointerdown", down);
      button.removeEventListener("pointerup", up);
      button.removeEventListener("pointercancel", up);
    });
    pad.append(button);
  }
  const center = document.createElement("span");
  center.className = "console-dpad__center";
  center.setAttribute("aria-hidden", "true");
  pad.append(center);
  zone.append(pad);
  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}
