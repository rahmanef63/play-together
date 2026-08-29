import type { BrowserGameContext, ControllerGameModule } from "@play-together/game-sdk";

interface PongState {
  kind: "pong";
  phase: "waiting" | "playing";
  paddles: [number, number];
  score: [number, number];
  players: Array<string | null>;
}

export const mountController: ControllerGameModule["mountController"] = (
  root: HTMLElement,
  context: BrowserGameContext,
) => {
  root.replaceChildren();
  const shell = document.createElement("section");
  shell.className = `pong-controller pong-controller--${context.mode}`;
  shell.style.cssText =
    "width:100%;height:100%;display:grid;grid-template-rows:auto 1fr;gap:12px;padding:12px;touch-action:none;user-select:none;-webkit-user-select:none;background:#cbd5cd;color:#07110c";

  const info = document.createElement("strong");
  info.style.cssText =
    "font:850 14px/1.2 ui-monospace,monospace;letter-spacing:.04em;text-align:center";
  info.textContent = "PONG · READY";

  const controls = document.createElement("div");
  controls.className = "pong-controller__controls";
  controls.style.cssText = "display:grid;grid-template-rows:1fr 1fr;gap:12px;min-height:0";
  const up = createButton("▲", "Move paddle up");
  const down = createButton("▼", "Move paddle down");
  controls.append(up, down);
  shell.append(info, controls);
  root.append(shell);

  let direction = 0;
  const held: number[] = [];
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
      held.push(value);
      setDirection(value);
    };
    const stop = (event: PointerEvent) => {
      event.preventDefault();
      const index = held.lastIndexOf(value);
      if (index >= 0) held.splice(index, 1);
      setDirection(held.at(-1) ?? 0);
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
    if (event.repeat) return;
    if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") setDirection(-1);
    if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") setDirection(1);
  };
  const keyup = (event: KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "w", "W", "s", "S"].includes(event.key)) setDirection(0);
  };
  window.addEventListener("keydown", keydown);
  window.addEventListener("keyup", keyup);

  const unsubscribe = context.subscribe((message) => {
    if (!isPongState(message.state)) return;
    const slot = message.state.players.findIndex((id) => id === context.playerId);
    const side = slot === 0 ? "LEFT" : slot === 1 ? "RIGHT" : "SPECTATOR";
    info.textContent = `PONG · ${side} · ${message.state.score[0]} — ${message.state.score[1]}`;
  });
  context.setStatus(
    context.mode === "handheld" ? "Pong handheld ready" : "Pong phone remote ready",
  );

  return () => {
    setDirection(0);
    unbindUp();
    unbindDown();
    unsubscribe();
    window.removeEventListener("keydown", keydown);
    window.removeEventListener("keyup", keyup);
    root.replaceChildren();
  };
};

function createButton(label: string, accessibleName: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.setAttribute("aria-label", accessibleName);
  button.style.cssText =
    "appearance:none;border:0;border-radius:24px;background:#d7ffe5;color:#07110c;font:900 clamp(34px,10vw,64px)/1 system-ui;box-shadow:0 7px 0 #78a88a;touch-action:none;min-height:72px";
  return button;
}

function isPongState(value: unknown): value is PongState {
  return (
    typeof value === "object" && value !== null && (value as { kind?: unknown }).kind === "pong"
  );
}
