import type { ConsoleControl } from "@play-together/contracts";
import type { BrowserGameContext } from "@play-together/game-sdk";
import { gameFeedback } from "../feedback/feedbackEngine";
import { bindKeys, runAction } from "./actions";
import { directionGraphic, dpadBackdrop } from "./svg";
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
  pad.append(dpadBackdrop());
  const cleanups: Cleanup[] = [];

  for (const direction of ["up", "down", "left", "right"] as const) {
    const spec = control.directions[direction];
    if (!spec) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `console-dpad__button console-dpad__button--${direction}`;
    button.append(directionGraphic(direction));
    button.setAttribute("aria-label", `${control.ariaLabel} ${direction}`);
    let pressed = false;
    const down = (event?: PointerEvent) => {
      if (pressed) return;
      pressed = true;
      if (event) button.setPointerCapture(event.pointerId);
      gameFeedback.unlock();
      gameFeedback.cue("control");
      runAction(spec.press, state, context);
      button.dataset.active = "true";
    };
    const up = () => {
      if (!pressed) return;
      pressed = false;
      if (spec.release) runAction(spec.release, state, context);
      delete button.dataset.active;
    };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
    button.addEventListener("lostpointercapture", up);
    window.addEventListener("blur", up);
    const removeKeys = bindKeys(spec.keys ?? [], down, up);
    cleanups.push(() => {
      up();
      removeKeys();
      button.removeEventListener("pointerdown", down);
      button.removeEventListener("pointerup", up);
      button.removeEventListener("pointercancel", up);
      button.removeEventListener("lostpointercapture", up);
      window.removeEventListener("blur", up);
    });
    pad.append(button);
  }
  zone.append(pad);
  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}
