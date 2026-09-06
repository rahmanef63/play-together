import type { BuiltinConsoleConfig, ConsoleControl, ConsoleZone } from "@play-together/contracts";
import type { Cleanup } from "./types";

export interface ControllerSystemOptions {
  gameTitle: string;
  gameDescription: string;
  onMenu: () => void;
}

export function mountControllerSystemActions(
  wrapper: HTMLElement,
  zones: Map<ConsoleZone, HTMLElement>,
  config: BuiltinConsoleConfig,
  options: ControllerSystemOptions,
): Cleanup {
  wrapper.dataset.advancedControls = "false";
  for (const zone of zones.values()) {
    const children = [...zone.children] as HTMLElement[];
    if (children.length > 0 && children.every((child) => child.dataset.shoulder === "true")) {
      zone.dataset.advancedOnly = "true";
    }
  }
  const bottom = zones.get("bottom");
  if (!bottom) return () => undefined;
  bottom.dataset.systemActions = "true";

  const actions = document.createElement("div");
  actions.className = "console-system-actions";
  const help = systemButton("HOW TO", "How to play");
  help.dataset.systemAction = "how-to";
  const menu = systemButton("MENU", "Open game menu");
  menu.dataset.systemAction = "menu";
  actions.append(help, menu);
  bottom.append(actions);

  const overlay = createHowTo(wrapper, config, options);
  const openHelp = () => {
    overlay.hidden = false;
    overlay.querySelector<HTMLButtonElement>('[data-how-to-action="close"]')?.focus();
  };
  const closeHelp = () => {
    overlay.hidden = true;
    help.focus();
  };
  const onHelp = () => openHelp();
  const onMenu = () => options.onMenu();
  help.addEventListener("click", onHelp);
  menu.addEventListener("click", onMenu);
  overlay
    .querySelector<HTMLButtonElement>('[data-how-to-action="close"]')
    ?.addEventListener("click", closeHelp);
  const advanced = overlay.querySelector<HTMLButtonElement>('[data-how-to-action="advanced"]');
  const toggleAdvanced = () => {
    const enabled = wrapper.dataset.advancedControls !== "true";
    wrapper.dataset.advancedControls = String(enabled);
    if (advanced) {
      advanced.textContent = enabled ? "Hide advanced controls" : "Show advanced controls";
      advanced.setAttribute("aria-pressed", String(enabled));
    }
  };
  advanced?.addEventListener("click", toggleAdvanced);
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape" && !overlay.hidden) closeHelp();
  };
  window.addEventListener("keydown", onKey);

  return () => {
    window.removeEventListener("keydown", onKey);
    help.removeEventListener("click", onHelp);
    menu.removeEventListener("click", onMenu);
    advanced?.removeEventListener("click", toggleAdvanced);
    overlay.remove();
    actions.remove();
    delete bottom.dataset.systemActions;
  };
}

function createHowTo(
  wrapper: HTMLElement,
  config: BuiltinConsoleConfig,
  options: ControllerSystemOptions,
): HTMLElement {
  const overlay = document.createElement("section");
  overlay.className = "console-how-to";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", `${options.gameTitle} how to play`);
  const panel = document.createElement("div");
  panel.className = "console-how-to__panel";
  const header = document.createElement("header");
  const heading = document.createElement("strong");
  heading.textContent = `${options.gameTitle} · HOW TO PLAY`;
  const close = systemButton("×", "Close how to play");
  close.dataset.howToAction = "close";
  header.append(heading, close);
  const description = document.createElement("p");
  description.textContent = options.gameDescription;
  const basic = legendSection(
    "CORE CONTROLS",
    config.controls.filter((control) => !isAdvancedControl(control)),
  );
  panel.append(header, description, basic);
  const advancedControls = config.controls.filter(isAdvancedControl);
  if (advancedControls.length) {
    const advanced = legendSection("ADVANCED / PHYSICAL GAMEPAD", advancedControls);
    advanced.dataset.advancedLegend = "true";
    const toggle = systemButton("Show advanced controls", "Toggle advanced controls");
    toggle.dataset.howToAction = "advanced";
    toggle.setAttribute("aria-pressed", "false");
    panel.append(advanced, toggle);
  }
  const note = document.createElement("small");
  note.textContent =
    "Hold actions stay active while the button is held. Shoulder controls stay hidden by default.";
  panel.append(note);
  overlay.append(panel);
  wrapper.append(overlay);
  return overlay;
}

function legendSection(title: string, controls: ConsoleControl[]): HTMLElement {
  const section = document.createElement("section");
  section.className = "console-how-to__legend";
  const heading = document.createElement("b");
  heading.textContent = title;
  section.append(heading);
  for (const control of controls) {
    const row = document.createElement("div");
    const key = document.createElement("kbd");
    key.textContent = controlGlyph(control);
    const label = document.createElement("span");
    label.textContent = control.ariaLabel;
    row.append(key, label);
    section.append(row);
  }
  return section;
}

export function isAdvancedControl(control: ConsoleControl): boolean {
  return control.kind === "button" && Boolean(control.face && /^(l|r)[12]$/.test(control.face));
}

export function controlGlyph(control: ConsoleControl): string {
  if (control.kind === "stick") return "STICK";
  if (control.kind === "dpad") return "D-PAD";
  if (control.kind === "touchpad") return "TOUCH";
  if (control.face) return control.face.toUpperCase();
  return control.label.toUpperCase();
}

function systemButton(text: string, ariaLabel: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "console-system-button";
  button.textContent = text;
  button.setAttribute("aria-label", ariaLabel);
  button.draggable = false;
  return button;
}
