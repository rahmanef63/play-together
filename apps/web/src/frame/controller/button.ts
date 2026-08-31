import type { ConsoleControl } from "@play-together/contracts";
import type { BrowserGameContext } from "@play-together/game-sdk";
import { bindKeys, runAction } from "./actions";
import type { Cleanup, MutableState } from "./types";

type ButtonControl = Extract<ConsoleControl, { kind: "button" }>;

export function mountButton(
  zone: HTMLElement,
  control: ButtonControl,
  state: MutableState,
  context: BrowserGameContext,
): Cleanup {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "console-control console-control--button";
  button.dataset.controlId = control.id;
  if (control.face) button.dataset.face = control.face;
  const visibleLabel = control.displayLabel ?? legacySemanticButtonLabel(control) ?? control.label;
  button.textContent = visibleLabel;
  if (visibleLabel !== control.label) button.dataset.semanticLabel = "true";
  button.setAttribute("aria-label", control.ariaLabel);

  const down = (event?: PointerEvent) => {
    if (event) button.setPointerCapture(event.pointerId);
    runAction(control.press, state, context);
    button.dataset.active = "true";
  };
  const up = () => {
    if (control.release) runAction(control.release, state, context);
    delete button.dataset.active;
  };
  button.addEventListener("pointerdown", down);
  button.addEventListener("pointerup", up);
  button.addEventListener("pointercancel", up);
  zone.append(button);
  const removeKeys = bindKeys(control.keys ?? [], down, up);
  return () => {
    removeKeys();
    button.removeEventListener("pointerdown", down);
    button.removeEventListener("pointerup", up);
    button.removeEventListener("pointercancel", up);
  };
}

function legacySemanticButtonLabel(control: ButtonControl): string | null {
  if (!/^(A|B|X|Y)$/i.test(control.label.trim())) return null;
  const exact: Record<string, string> = {
    "Reaction button": "REACT",
    "Tap on beat": "TAP",
    "Tap to race": "TAP",
    "Drop block": "DROP",
    "Pull rope": "PULL",
    "Fire cannon": "CANNON",
    "Fire missile": "MISSILE",
    "Toggle flaps": "FLAPS",
    "Toggle landing gear": "GEAR",
    "Throttle up": "THR +",
    "Throttle down": "THR −",
    "Increase throttle": "THR +",
    "Decrease throttle": "THR −",
    "Nitro boost": "BOOST",
  };
  const mapped = exact[control.ariaLabel.trim()];
  if (mapped) return mapped;
  return (
    control.ariaLabel.match(/^(Red|Green|Blue|Yellow) memory pad$/i)?.[1]?.toUpperCase() ?? null
  );
}
