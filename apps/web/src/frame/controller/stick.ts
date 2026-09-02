import type { ConsoleControl } from "@play-together/contracts";
import type { BrowserGameContext } from "@play-together/game-sdk";
import { gameFeedback } from "../feedback/feedbackEngine";
import { clamp, runAction } from "./actions";
import { stickGraphic } from "./svg";
import type { Cleanup, MutableState } from "./types";

export function mountStick(
  zone: HTMLElement,
  control: Extract<ConsoleControl, { kind: "stick" }>,
  state: MutableState,
  context: BrowserGameContext,
): Cleanup {
  const stick = document.createElement("div");
  stick.className = "console-control console-control--stick";
  stick.dataset.controlId = control.id;
  stick.setAttribute("role", "application");
  stick.setAttribute("aria-label", control.ariaLabel);
  const { svg, knob } = stickGraphic();
  stick.append(svg);
  zone.append(stick);

  let keyboardX = 0;
  let keyboardY = 0;
  let pointerActive = false;
  const emit = (x: number, y: number) => {
    const nx = clamp(x, -1, 1);
    const ny = clamp(y, -1, 1);
    knob.style.transform = `translate(${nx * 24}px, ${-ny * 24}px)`;
    runAction(control.action, state, context, { x: nx, y: ny });
  };
  const move = (event: PointerEvent) => {
    const rect = stick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.38);
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const distance = Math.hypot(dx, dy);
    const scale = distance > radius ? radius / distance : 1;
    emit((dx * scale) / radius, (-dy * scale) / radius);
  };
  const down = (event: PointerEvent) => {
    pointerActive = true;
    stick.setPointerCapture(event.pointerId);
    stick.dataset.active = "true";
    gameFeedback.unlock();
    gameFeedback.cue("control");
    move(event);
  };
  const pointerMove = (event: PointerEvent) => {
    if (pointerActive && stick.hasPointerCapture(event.pointerId)) move(event);
  };
  const up = () => {
    if (!pointerActive) return;
    pointerActive = false;
    delete stick.dataset.active;
    knob.style.transform = "translate(0px, 0px)";
    runAction(control.release ?? control.action, state, context, { x: 0, y: 0 });
  };
  stick.addEventListener("pointerdown", down);
  stick.addEventListener("pointermove", pointerMove);
  stick.addEventListener("pointerup", up);
  stick.addEventListener("pointercancel", up);
  stick.addEventListener("lostpointercapture", up);
  window.addEventListener("blur", up);

  const keyLookup = new Map<string, "up" | "down" | "left" | "right">();
  for (const direction of ["up", "down", "left", "right"] as const)
    for (const key of control.keys?.[direction] ?? []) keyLookup.set(key, direction);
  const activeKeys = new Set<string>();
  const keydown = (event: KeyboardEvent) => {
    const direction = keyLookup.get(event.code) ?? keyLookup.get(event.key);
    if (!direction || activeKeys.has(event.code)) return;
    activeKeys.add(event.code);
    if (direction === "left") keyboardX = -1;
    if (direction === "right") keyboardX = 1;
    if (direction === "up") keyboardY = 1;
    if (direction === "down") keyboardY = -1;
    emit(keyboardX, keyboardY);
  };
  const keyup = (event: KeyboardEvent) => {
    const direction = keyLookup.get(event.code) ?? keyLookup.get(event.key);
    if (!direction) return;
    activeKeys.delete(event.code);
    if (direction === "left" || direction === "right") keyboardX = 0;
    if (direction === "up" || direction === "down") keyboardY = 0;
    emit(keyboardX, keyboardY);
  };
  window.addEventListener("keydown", keydown);
  window.addEventListener("keyup", keyup);
  return () => {
    up();
    window.removeEventListener("keydown", keydown);
    window.removeEventListener("keyup", keyup);
    window.removeEventListener("blur", up);
    stick.removeEventListener("pointerdown", down);
    stick.removeEventListener("pointermove", pointerMove);
    stick.removeEventListener("pointerup", up);
    stick.removeEventListener("pointercancel", up);
    stick.removeEventListener("lostpointercapture", up);
  };
}
