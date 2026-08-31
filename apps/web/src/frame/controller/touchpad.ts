import type { ConsoleControl } from "@play-together/contracts";
import type { BrowserGameContext } from "@play-together/game-sdk";
import { clamp, runAction } from "./actions";
import type { Cleanup, MutableState } from "./types";

export function mountTouchpad(
  zone: HTMLElement,
  control: Extract<ConsoleControl, { kind: "touchpad" }>,
  state: MutableState,
  context: BrowserGameContext,
): Cleanup {
  const pad = document.createElement("button");
  pad.type = "button";
  pad.className = "console-control console-control--touchpad";
  pad.dataset.controlId = control.id;
  pad.setAttribute("aria-label", control.ariaLabel);
  const crosshair = document.createElement("span");
  crosshair.className = "console-touchpad__crosshair";
  pad.append(crosshair);
  const send = (event: PointerEvent) => {
    const rect = pad.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    const y = clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
    crosshair.style.left = `${x * 100}%`;
    crosshair.style.top = `${y * 100}%`;
    runAction(control.action, state, context, { x, y });
  };
  pad.addEventListener("pointerdown", send);
  zone.append(pad);
  return () => pad.removeEventListener("pointerdown", send);
}
