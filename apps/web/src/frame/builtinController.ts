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
    (control) =>
      control.kind === "button" &&
      control.zone === "right" &&
      control.face !== undefined &&
      ["a", "b", "c", "d", "x", "y"].includes(control.face),
  );
  if (faceButtons.length === 4)
    zones.get("right")?.classList.add("builtin-controller__zone--face-cluster");

  const cleanups = config.controls.flatMap((control) => {
    const zone = zones.get(control.zone);
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
