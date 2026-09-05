import type { ConsoleControl } from "@play-together/contracts";
import type { BrowserGameContext } from "@play-together/game-sdk";
import { gameFeedback } from "../feedback/feedbackEngine";
import type { PhysicalBindings } from "./gamepad";
import { runHeldAction } from "./heldActions";
import { bindPress } from "./press";
import { faceGraphic } from "./svg";
import type { Cleanup, MutableState } from "./types";

type ButtonControl = Extract<ConsoleControl, { kind: "button" }>;

export function mountButton(
  zone: HTMLElement,
  control: ButtonControl,
  state: MutableState,
  context: BrowserGameContext,
  bindings: PhysicalBindings = new Map(),
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
  } else if (control.face && /^(l|r)[12]$/.test(control.face)) {
    const glyph = document.createElement("strong");
    glyph.textContent = control.face.toUpperCase();
    const action = document.createElement("small");
    action.textContent = control.displayLabel ?? control.ariaLabel;
    button.append(glyph, action);
    button.dataset.shoulder = "true";
  } else {
    button.textContent = visibleLabel;
    if (visibleLabel !== control.label) button.dataset.semanticLabel = "true";
  }
  button.setAttribute("aria-label", control.ariaLabel);

  const input = bindPress(button, control.keys ?? [], (pressed) => {
    if (pressed) {
      gameFeedback.unlock();
      gameFeedback.cue("control");
    }
    runHeldAction(control, pressed, control.press, control.release, state, context);
    if (pressed) button.dataset.active = "true";
    else delete button.dataset.active;
    if (control.release) button.setAttribute("aria-pressed", String(pressed));
  });
  bindings.set(control.id, { button: input.setGamepad });
  zone.append(button);
  return () => {
    input.dispose();
    bindings.delete(control.id);
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
