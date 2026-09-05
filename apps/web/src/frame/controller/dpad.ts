import type { ConsoleControl } from "@play-together/contracts";
import type { BrowserGameContext } from "@play-together/game-sdk";
import { gameFeedback } from "../feedback/feedbackEngine";
import type { PhysicalBindings } from "./gamepad";
import { runHeldAction } from "./heldActions";
import { bindPress } from "./press";
import { directionGraphic, dpadBackdrop } from "./svg";
import type { Cleanup, MutableState } from "./types";

export function mountDpad(
  zone: HTMLElement,
  control: Extract<ConsoleControl, { kind: "dpad" }>,
  state: MutableState,
  context: BrowserGameContext,
  bindings: PhysicalBindings = new Map(),
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
    const input = bindPress(button, spec.keys ?? [], (pressed) => {
      if (pressed) {
        gameFeedback.unlock();
        gameFeedback.cue("control");
      }
      runHeldAction(spec, pressed, spec.press, spec.release, state, context);
      if (pressed) button.dataset.active = "true";
      else delete button.dataset.active;
      button.setAttribute("aria-pressed", String(pressed));
    });
    const bindingId = `${control.id}:${direction}`;
    bindings.set(bindingId, { button: input.setGamepad });
    cleanups.push(() => {
      input.dispose();
      bindings.delete(bindingId);
    });
    pad.append(button);
  }
  zone.append(pad);
  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}
