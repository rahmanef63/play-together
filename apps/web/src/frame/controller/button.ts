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
  const visibleLabel = control.displayLabel ?? semanticButtonLabel(control);
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

export function semanticButtonLabel(control: ButtonControl): string {
  const label = control.label.trim();
  if (!/^(A|B|X|Y)$/i.test(label)) return label;
  const semantic = control.ariaLabel
    .replace(/\b(button|control|pad)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  if (!semantic) return label;
  if (semantic.length <= 16) return semantic;
  const words = semantic.split(" ");
  let compact = "";
  for (const word of words) {
    const candidate = compact ? `${compact} ${word}` : word;
    if (candidate.length > 16) break;
    compact = candidate;
  }
  return compact || semantic.slice(0, 16).trim();
}
