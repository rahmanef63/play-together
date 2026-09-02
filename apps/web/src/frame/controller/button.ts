import type { ConsoleControl } from "@play-together/contracts";
import type { BrowserGameContext } from "@play-together/game-sdk";
import { gameFeedback } from "../feedback/feedbackEngine";
import { bindKeys, runAction } from "./actions";
import { faceGraphic } from "./svg";
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
  const faceGlyph = canonicalFaceGlyph(control.face);
  const canonicalFace = faceGlyph !== null;
  const visibleLabel = canonicalFace
    ? faceGlyph
    : (control.displayLabel ?? semanticButtonLabel(control));
  if (canonicalFace) {
    button.append(faceGraphic(visibleLabel));
    const action = document.createElement("small");
    action.className = "console-control__action-label";
    action.textContent = control.displayLabel ?? semanticButtonLabel(control);
    button.append(action);
    button.dataset.canonicalFace = "true";
  } else {
    button.textContent = visibleLabel;
    if (visibleLabel !== control.label) button.dataset.semanticLabel = "true";
  }
  button.setAttribute("aria-label", control.ariaLabel);

  let pressed = false;
  const down = (event?: PointerEvent) => {
    if (pressed) return;
    pressed = true;
    if (event) button.setPointerCapture(event.pointerId);
    gameFeedback.unlock();
    gameFeedback.cue("control");
    runAction(control.press, state, context);
    button.dataset.active = "true";
  };
  const up = () => {
    if (!pressed) return;
    pressed = false;
    if (control.release) runAction(control.release, state, context);
    delete button.dataset.active;
  };
  button.addEventListener("pointerdown", down);
  button.addEventListener("pointerup", up);
  button.addEventListener("pointercancel", up);
  button.addEventListener("lostpointercapture", up);
  window.addEventListener("blur", up);
  zone.append(button);
  const removeKeys = bindKeys(control.keys ?? [], down, up);
  return () => {
    up();
    removeKeys();
    button.removeEventListener("pointerdown", down);
    button.removeEventListener("pointerup", up);
    button.removeEventListener("pointercancel", up);
    button.removeEventListener("lostpointercapture", up);
    window.removeEventListener("blur", up);
  };
}

function canonicalFaceGlyph(face: ButtonControl["face"]): string | null {
  if (face === "a") return "A";
  if (face === "b") return "B";
  if (face === "c" || face === "x") return "X";
  if (face === "d" || face === "y") return "Y";
  return null;
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
