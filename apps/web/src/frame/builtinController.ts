import type {
  BuiltinConsoleConfig,
  ConsoleAction,
  ConsoleControl,
  ConsoleZone,
} from "@play-together/contracts";
import type { BrowserGameContext } from "@play-together/game-sdk";

type Variables = Record<string, number | string | boolean>;
type MutableState = Record<string, unknown>;

type Cleanup = () => void;

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

  const cleanups: Cleanup[] = [];
  for (const control of config.controls) {
    const zone = zones.get(control.zone);
    if (!zone) continue;
    const mounted = mountControl(zone, control, state, context);
    cleanups.push(mounted);
  }

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
  switch (control.kind) {
    case "button":
      return mountButton(zone, control, state, context);
    case "dpad":
      return mountDpad(zone, control, state, context);
    case "stick":
      return mountStick(zone, control, state, context);
    case "touchpad":
      return mountTouchpad(zone, control, state, context);
  }
}

function mountButton(
  zone: HTMLElement,
  control: Extract<ConsoleControl, { kind: "button" }>,
  state: MutableState,
  context: BrowserGameContext,
): Cleanup {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "console-control console-control--button";
  button.dataset.controlId = control.id;
  if (control.face) button.dataset.face = control.face;
  button.textContent = control.label;
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

function mountDpad(
  zone: HTMLElement,
  control: Extract<ConsoleControl, { kind: "dpad" }>,
  state: MutableState,
  context: BrowserGameContext,
): Cleanup {
  const pad = document.createElement("div");
  pad.className = "console-control console-control--dpad";
  pad.dataset.controlId = control.id;
  pad.setAttribute("role", "group");
  pad.setAttribute("aria-label", control.ariaLabel);
  const cleanups: Cleanup[] = [];
  const meta = {
    up: { label: "▲", aria: "Up" },
    down: { label: "▼", aria: "Down" },
    left: { label: "◀", aria: "Left" },
    right: { label: "▶", aria: "Right" },
  } as const;

  for (const direction of ["up", "down", "left", "right"] as const) {
    const spec = control.directions[direction];
    if (!spec) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `console-dpad__button console-dpad__button--${direction}`;
    button.textContent = meta[direction].label;
    button.setAttribute("aria-label", `${control.ariaLabel} ${meta[direction].aria.toLowerCase()}`);
    const down = (event?: PointerEvent) => {
      if (event) button.setPointerCapture(event.pointerId);
      runAction(spec.press, state, context);
      button.dataset.active = "true";
    };
    const up = () => {
      if (spec.release) runAction(spec.release, state, context);
      delete button.dataset.active;
    };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
    const removeKeys = bindKeys(spec.keys ?? [], down, up);
    cleanups.push(() => {
      removeKeys();
      button.removeEventListener("pointerdown", down);
      button.removeEventListener("pointerup", up);
      button.removeEventListener("pointercancel", up);
    });
    pad.append(button);
  }
  const center = document.createElement("span");
  center.className = "console-dpad__center";
  center.setAttribute("aria-hidden", "true");
  pad.append(center);
  zone.append(pad);
  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}

function mountStick(
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
  const knob = document.createElement("span");
  knob.className = "console-stick__knob";
  stick.append(knob);
  zone.append(stick);

  let keyboardX = 0;
  let keyboardY = 0;
  const emit = (x: number, y: number) => {
    const nx = clamp(x, -1, 1);
    const ny = clamp(y, -1, 1);
    knob.style.setProperty("--stick-x", `${nx * 38}%`);
    knob.style.setProperty("--stick-y", `${-ny * 38}%`);
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
    stick.setPointerCapture(event.pointerId);
    stick.dataset.active = "true";
    move(event);
  };
  const pointerMove = (event: PointerEvent) => {
    if (stick.hasPointerCapture(event.pointerId)) move(event);
  };
  const up = () => {
    delete stick.dataset.active;
    knob.style.setProperty("--stick-x", "0%");
    knob.style.setProperty("--stick-y", "0%");
    if (control.release) runAction(control.release, state, context, { x: 0, y: 0 });
    else runAction(control.action, state, context, { x: 0, y: 0 });
  };
  stick.addEventListener("pointerdown", down);
  stick.addEventListener("pointermove", pointerMove);
  stick.addEventListener("pointerup", up);
  stick.addEventListener("pointercancel", up);

  const keyLookup = new Map<string, "up" | "down" | "left" | "right">();
  for (const direction of ["up", "down", "left", "right"] as const) {
    for (const key of control.keys?.[direction] ?? []) keyLookup.set(key, direction);
  }
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
    window.removeEventListener("keydown", keydown);
    window.removeEventListener("keyup", keyup);
    stick.removeEventListener("pointerdown", down);
    stick.removeEventListener("pointermove", pointerMove);
    stick.removeEventListener("pointerup", up);
    stick.removeEventListener("pointercancel", up);
  };
}

function mountTouchpad(
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

function runAction(
  action: ConsoleAction,
  state: MutableState,
  context: BrowserGameContext,
  variables: Variables = {},
): void {
  switch (action.type) {
    case "send":
      context.sendInput(resolveTemplate(action.payload, variables) as Record<string, unknown>);
      break;
    case "patch":
      Object.assign(state, resolveTemplate(action.values, variables));
      context.sendInput({ ...state });
      break;
    case "toggle":
      state[action.field] = !Boolean(state[action.field]);
      context.sendInput({ ...state });
      break;
    case "increment": {
      const current = Number(state[action.field] ?? 0);
      const min = action.min ?? Number.NEGATIVE_INFINITY;
      const max = action.max ?? Number.POSITIVE_INFINITY;
      state[action.field] = clamp(current + action.delta, min, max);
      context.sendInput({ ...state });
      break;
    }
    case "pulse": {
      Object.assign(state, resolveTemplate(action.values, variables));
      context.sendInput({ ...state });
      window.setTimeout(() => {
        Object.assign(state, resolveTemplate(action.releaseValues, variables));
        context.sendInput({ ...state });
      }, action.durationMs);
      break;
    }
  }
}

function bindKeys(keys: string[], down: () => void, up: () => void): Cleanup {
  if (!keys.length) return () => undefined;
  const keySet = new Set(keys);
  const active = new Set<string>();
  const keydown = (event: KeyboardEvent) => {
    if (!(keySet.has(event.code) || keySet.has(event.key)) || active.has(event.code)) return;
    active.add(event.code);
    down();
  };
  const keyup = (event: KeyboardEvent) => {
    if (!(keySet.has(event.code) || keySet.has(event.key))) return;
    active.delete(event.code);
    up();
  };
  window.addEventListener("keydown", keydown);
  window.addEventListener("keyup", keyup);
  return () => {
    window.removeEventListener("keydown", keydown);
    window.removeEventListener("keyup", keyup);
  };
}

function resolveTemplate(value: unknown, variables: Variables): unknown {
  if (typeof value === "string" && value.startsWith("$")) {
    const key = value.slice(1);
    return Object.hasOwn(variables, key) ? variables[key] : value;
  }
  if (Array.isArray(value)) return value.map((item) => resolveTemplate(item, variables));
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveTemplate(item, variables)]),
    );
  }
  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
