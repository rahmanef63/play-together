import type { ConsoleShellPreset, GameManifest } from "@play-together/contracts";

export type ConsoleShellMode = "handheld" | "remote";

export interface ConsoleShellSurface {
  screen: HTMLElement | undefined;
  telemetry: HTMLElement | undefined;
  controls: HTMLElement;
  dispose(): void;
}

export function resolveConsoleShellPreset(manifest: GameManifest): ConsoleShellPreset {
  if (manifest.controller.shellPreset) return manifest.controller.shellPreset;
  const layout = manifest.controller.console?.layout;
  if (layout === "racing") return "racing";
  if (layout === "flight") return "flight";
  return "classic";
}

export function mountConsoleShell(
  root: HTMLElement,
  options: { mode: ConsoleShellMode; preset: ConsoleShellPreset; title: string },
): ConsoleShellSurface {
  root.replaceChildren();
  root.dataset.layout = options.mode;
  root.dataset.consolePreset = options.preset;

  const shell = document.createElement("section");
  shell.className = `console-shell console-shell--${options.mode} console-shell--${options.preset}`;
  shell.setAttribute("aria-label", `${options.title} ${options.mode} console`);

  const chassis = document.createElement("div");
  chassis.className = "console-shell__chassis";

  const controls = document.createElement("section");
  controls.className = "console-shell__controls";
  controls.setAttribute("aria-label", `${options.title} controls`);

  let screen: HTMLElement | undefined;
  let telemetry: HTMLElement | undefined;
  if (options.mode === "handheld") {
    screen = document.createElement("section");
    screen.className = "console-shell__screen handheld-screen";
    screen.setAttribute("aria-label", `${options.title} game screen`);
    controls.classList.add("handheld-controls");
    chassis.append(screen, controls);
  } else {
    telemetry = document.createElement("section");
    telemetry.className = "console-shell__telemetry";
    telemetry.setAttribute("aria-label", `${options.title} game status`);
    chassis.append(telemetry, controls);
  }

  shell.append(chassis);
  root.append(shell);

  return {
    screen,
    telemetry,
    controls,
    dispose() {
      root.replaceChildren();
      delete root.dataset.layout;
      delete root.dataset.consolePreset;
    },
  };
}
