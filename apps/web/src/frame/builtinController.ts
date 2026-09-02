import type { BuiltinConsoleConfig, ConsoleControl, ConsoleZone } from "@play-together/contracts";
import type { BrowserGameContext } from "@play-together/game-sdk";
import { mountButton } from "./controller/button";
import { mountDpad } from "./controller/dpad";
import { mountStick } from "./controller/stick";
import { mountTouchpad } from "./controller/touchpad";
import type { Cleanup, MutableState } from "./controller/types";

const ZONES: ConsoleZone[] = [
  "top-left",
  "top-right",
  "left",
  "center",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
];

export function mountBuiltinController(
  root: HTMLElement,
  config: BuiltinConsoleConfig,
  context: BrowserGameContext,
): Cleanup {
  root.replaceChildren();
  const state: MutableState = structuredClone(config.initialState ?? {});
  const wrapper = document.createElement("section");
  wrapper.className = `builtin-controller builtin-controller--${config.layout}`;
  wrapper.dataset.renderer = "builtin";
  const zones = new Map<ConsoleZone, HTMLElement>();
  for (const zone of ZONES) {
    const element = document.createElement("div");
    element.className = `builtin-controller__zone builtin-controller__zone--${zone}`;
    element.dataset.zone = zone;
    zones.set(zone, element);
    wrapper.append(element);
  }
  const faceButtons = config.controls.filter(
    (control) => control.kind === "button" && isFaceButton(control.face),
  );
  if (faceButtons.length === 4)
    zones.get("right")?.classList.add("builtin-controller__zone--face-cluster");

  const cleanups = config.controls.flatMap((control) => {
    const zone = zones.get(physicalZoneForControl(control));
    return zone ? [mountControl(zone, control, state, context)] : [];
  });
  root.append(wrapper);
  return () => {
    for (const cleanup of cleanups) cleanup();
    root.replaceChildren();
  };
}

function mountControl(
  zone: HTMLElement,
  control: ConsoleControl,
  state: MutableState,
  context: BrowserGameContext,
): Cleanup {
  if (control.kind === "button") return mountButton(zone, control, state, context);
  if (control.kind === "dpad") return mountDpad(zone, control, state, context);
  if (control.kind === "stick") return mountStick(zone, control, state, context);
  return mountTouchpad(zone, control, state, context);
}

export function physicalZoneForControl(control: ConsoleControl): ConsoleZone {
  if (control.kind !== "button" || !control.face) return control.zone;
  if (isFaceButton(control.face)) return "right";
  if (control.face === "l1" || control.face === "l2") return "top-left";
  if (control.face === "r1" || control.face === "r2") return "top-right";
  if (control.face === "start" || control.face === "select" || control.face === "pause")
    return "bottom";
  return control.zone;
}

function isFaceButton(face: Extract<ConsoleControl, { kind: "button" }>["face"]): boolean {
  return face !== undefined && ["a", "b", "c", "d", "x", "y"].includes(face);
}
