import type { BrowserGameContext, ControllerGameModule } from "@play-together/game-sdk";
import { drawPong, isPongSnapshot } from "./render";

export const mountController: ControllerGameModule["mountController"] = (
  root: HTMLElement,
  context: BrowserGameContext,
) => {
  root.replaceChildren();
  const shell = document.createElement("section");
  shell.className = `pong-controller pong-controller--${context.mode}`;
  shell.style.cssText =
    "width:100%;height:100%;display:grid;gap:16px;align-items:stretch;touch-action:none;user-select:none;-webkit-user-select:none";

  const screen = document.createElement("canvas");
  screen.className = "pong-controller__screen";
  screen.style.cssText =
    context.mode === "handheld"
      ? "display:block;width:100%;min-height:180px;border-radius:18px;background:#07110c;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)"
      : "display:none";

  const controls = document.createElement("div");
  controls.className = "pong-controller__controls";
  controls.style.cssText = "display:grid;grid-template-rows:1fr 1fr;gap:12px;min-height:220px";
  const up = createButton("▲", "Move paddle up");
  const down = createButton("▼", "Move paddle down");
  controls.append(up, down);
  shell.append(screen, controls);
  root.append(shell);

  const landscape = matchMedia("(orientation: landscape)");
  const arrange = () => {
    if (context.mode !== "handheld") {
      shell.style.gridTemplateColumns = "1fr";
      shell.style.gridTemplateRows = "1fr";
      controls.style.minHeight = "220px";
      return;
    }
    if (landscape.matches) {
      shell.style.gridTemplateColumns = "minmax(0,2.2fr) minmax(180px,.8fr)";
      shell.style.gridTemplateRows = "1fr";
      screen.style.minHeight = "0";
      screen.style.height = "100%";
      controls.style.minHeight = "0";
    } else {
      shell.style.gridTemplateColumns = "1fr";
      shell.style.gridTemplateRows = "minmax(180px,1fr) minmax(220px,.85fr)";
      screen.style.minHeight = "180px";
      screen.style.height = "auto";
      controls.style.minHeight = "220px";
    }
  };
  arrange();
  landscape.addEventListener("change", arrange);

  let direction = 0;
  const held = new Set<number>();
  const setDirection = (value: number) => {
    if (direction === value) return;
    direction = value;
    context.sendInput({ move: direction });
    if (value !== 0) navigator.vibrate?.(8);
  };
  const bind = (button: HTMLButtonElement, value: number) => {
    const start = (event: PointerEvent) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      held.add(value);
      setDirection(value);
    };
    const stop = (event: PointerEvent) => {
      event.preventDefault();
      held.delete(value);
      setDirection(held.size ? ([...held].at(-1) ?? 0) : 0);
    };
    button.addEventListener("pointerdown", start);
    button.addEventListener("pointerup", stop);
    button.addEventListener("pointercancel", stop);
    return () => {
      button.removeEventListener("pointerdown", start);
      button.removeEventListener("pointerup", stop);
      button.removeEventListener("pointercancel", stop);
    };
  };
  const unbindUp = bind(up, -1);
  const unbindDown = bind(down, 1);
  const keydown = (event: KeyboardEvent) => {
    if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") setDirection(-1);
    if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") setDirection(1);
  };
  const keyup = (event: KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "w", "W", "s", "S"].includes(event.key)) setDirection(0);
  };
  window.addEventListener("keydown", keydown);
  window.addEventListener("keyup", keyup);

  let latest: Parameters<typeof drawPong>[1] = null;
  const unsubscribe = context.subscribe((message) => {
    if (isPongSnapshot(message.state)) latest = message.state;
  });
  let animationFrame = 0;
  const render = () => {
    if (context.mode === "handheld") drawPong(screen, latest);
    animationFrame = requestAnimationFrame(render);
  };
  render();
  context.setStatus(
    context.mode === "handheld" ? "Handheld screen ready" : "Remote controller ready",
  );

  return () => {
    setDirection(0);
    unbindUp();
    unbindDown();
    unsubscribe();
    landscape.removeEventListener("change", arrange);
    window.removeEventListener("keydown", keydown);
    window.removeEventListener("keyup", keyup);
    cancelAnimationFrame(animationFrame);
    root.replaceChildren();
  };
};

function createButton(label: string, accessibleName: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.setAttribute("aria-label", accessibleName);
  button.style.cssText =
    "appearance:none;border:0;border-radius:24px;background:#d7ffe5;color:#07110c;font:800 clamp(36px,12vw,68px)/1 system-ui;box-shadow:0 8px 0 #78a88a;touch-action:none;min-height:92px";
  return button;
}
