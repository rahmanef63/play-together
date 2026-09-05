import type { ConsoleControl } from "@play-together/contracts";
import type { BrowserGameContext } from "@play-together/game-sdk";
import { gameFeedback } from "../feedback/feedbackEngine";
import { clamp, runAction } from "./actions";
import type { PhysicalBindings } from "./gamepad";
import { bindDirections } from "./keyboard";
import { stickGraphic } from "./svg";
import type { Cleanup, MutableState } from "./types";

export function mountStick(
  zone: HTMLElement,
  control: Extract<ConsoleControl, { kind: "stick" }>,
  state: MutableState,
  context: BrowserGameContext,
  bindings: PhysicalBindings = new Map(),
): Cleanup {
  const stick = document.createElement("div");
  stick.className = "console-control console-control--stick";
  stick.dataset.controlId = control.id;
  stick.setAttribute("role", "application");
  stick.setAttribute("aria-label", control.ariaLabel);
  const { svg, knob } = stickGraphic();
  stick.append(svg);
  zone.append(stick);

  let pointerId: number | null = null;
  let pointer: [number, number] = [0, 0];
  let keyboard: [number, number] = [0, 0];
  let gamepad: [number, number] = [0, 0];
  let last = "0,0";
  const emit = () => {
    const [x, y] = pointerId !== null ? pointer : keyboard.some(Boolean) ? keyboard : gamepad;
    const nx = clamp(x, -1, 1),
      ny = clamp(y, -1, 1);
    const next = `${nx},${ny}`;
    if (last === next) return;
    last = next;
    knob.style.transform = `translate(${nx * 24}px, ${-ny * 24}px)`;
    if (nx || ny) stick.dataset.active = "true";
    else delete stick.dataset.active;
    runAction(!nx && !ny && control.release ? control.release : control.action, state, context, {
      x: nx,
      y: ny,
    });
  };
  const move = (event: PointerEvent) => {
    const rect = stick.getBoundingClientRect();
    const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.38);
    const dx = event.clientX - rect.left - rect.width / 2;
    const dy = event.clientY - rect.top - rect.height / 2;
    const scale = Math.min(1, radius / (Math.hypot(dx, dy) || 1));
    pointer = [(dx * scale) / radius, (-dy * scale) / radius];
    emit();
  };
  const down = (event: PointerEvent) => {
    if (pointerId !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    pointerId = event.pointerId;
    stick.setPointerCapture(event.pointerId);
    gameFeedback.unlock();
    gameFeedback.cue("control");
    move(event);
  };
  const pointerMove = (event: PointerEvent) => {
    if (event.pointerId === pointerId) move(event);
  };
  const up = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    pointer = [0, 0];
    emit();
  };
  const reset = () => {
    pointerId = null;
    pointer = [0, 0];
    keyboard = [0, 0];
    gamepad = [0, 0];
    emit();
  };
  const hidden = () => {
    if (document.hidden) reset();
  };
  const removeKeys = bindDirections(control.keys, (x, y) => {
    keyboard = [x, y];
    emit();
  });
  bindings.set(control.id, {
    axes: (x, y) => {
      gamepad = [x, y];
      emit();
    },
  });
  stick.addEventListener("pointerdown", down);
  stick.addEventListener("pointermove", pointerMove);
  stick.addEventListener("pointerup", up);
  stick.addEventListener("pointercancel", up);
  stick.addEventListener("lostpointercapture", up);
  window.addEventListener("blur", reset);
  document.addEventListener("visibilitychange", hidden);
  return () => {
    removeKeys();
    reset();
    bindings.delete(control.id);
    window.removeEventListener("blur", reset);
    document.removeEventListener("visibilitychange", hidden);
    stick.removeEventListener("pointerdown", down);
    stick.removeEventListener("pointermove", pointerMove);
    stick.removeEventListener("pointerup", up);
    stick.removeEventListener("pointercancel", up);
    stick.removeEventListener("lostpointercapture", up);
  };
}
