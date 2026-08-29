import type { BrowserGameContext, ControllerGameModule } from "@play-together/game-sdk";

interface TapRaceSnapshot {
  kind: "tap-race";
  phase: "waiting" | "playing" | "finished";
  racers: Array<{ id: string; progress: number }>;
  winnerId: string | null;
  round: number;
}

export const mountController: ControllerGameModule["mountController"] = (
  root: HTMLElement,
  context: BrowserGameContext,
) => {
  root.replaceChildren();
  const shell = document.createElement("section");
  shell.className = `tap-race-controller tap-race-controller--${context.mode}`;
  shell.style.cssText =
    "width:100%;height:100%;display:grid;grid-template-rows:auto 1fr;gap:12px;padding:12px;align-items:stretch;touch-action:none;user-select:none;-webkit-user-select:none;background:#d8d4c8;color:#17120a";

  const info = document.createElement("strong");
  info.style.cssText = "font:850 14px/1.2 ui-monospace,monospace;text-align:center";
  info.textContent = "TAP RACE · READY";

  const tap = document.createElement("button");
  tap.type = "button";
  tap.textContent = "TAP";
  tap.setAttribute("aria-label", "Tap to race");
  tap.style.cssText =
    "appearance:none;border:0;border-radius:50%;aspect-ratio:1;max-height:100%;max-width:min(74vw,330px);width:100%;align-self:center;justify-self:center;background:#ffcf5a;color:#17120a;font:950 clamp(44px,14vw,92px)/1 system-ui;letter-spacing:-.08em;box-shadow:0 11px 0 #b87818,0 20px 44px rgba(0,0,0,.22);touch-action:manipulation";
  shell.append(info, tap);
  root.append(shell);

  let pointerDown = false;
  const sendTap = () => {
    context.sendInput({ action: "tap" });
    navigator.vibrate?.(7);
    tap.style.transform = "translateY(7px) scale(.985)";
    tap.style.boxShadow = "0 4px 0 #b87818,0 10px 24px rgba(0,0,0,.2)";
    setTimeout(() => {
      tap.style.transform = "";
      tap.style.boxShadow = "0 11px 0 #b87818,0 20px 44px rgba(0,0,0,.22)";
    }, 55);
  };
  const onPointerDown = (event: PointerEvent) => {
    event.preventDefault();
    if (pointerDown) return;
    pointerDown = true;
    tap.setPointerCapture(event.pointerId);
    sendTap();
  };
  const onPointerEnd = () => {
    pointerDown = false;
  };
  tap.addEventListener("pointerdown", onPointerDown);
  tap.addEventListener("pointerup", onPointerEnd);
  tap.addEventListener("pointercancel", onPointerEnd);
  const onKeyDown = (event: KeyboardEvent) => {
    if ((event.code === "Space" || event.code === "Enter") && !event.repeat) {
      event.preventDefault();
      sendTap();
    }
  };
  window.addEventListener("keydown", onKeyDown);

  const unsubscribe = context.subscribe((message) => {
    if (!isTapRaceSnapshot(message.state)) return;
    const state = message.state;
    const racer = state.racers.find((candidate) => candidate.id === context.playerId);
    const progress = Math.round(racer?.progress ?? 0);
    info.textContent =
      state.winnerId === context.playerId
        ? `ROUND ${state.round} · YOU WIN`
        : state.phase === "finished"
          ? `ROUND ${state.round} · FINISH · ${progress}%`
          : `ROUND ${state.round} · ${progress}%`;
  });
  context.setStatus(
    context.mode === "handheld" ? "Tap Race handheld ready" : "Tap Race phone remote ready",
  );

  return () => {
    unsubscribe();
    tap.removeEventListener("pointerdown", onPointerDown);
    tap.removeEventListener("pointerup", onPointerEnd);
    tap.removeEventListener("pointercancel", onPointerEnd);
    window.removeEventListener("keydown", onKeyDown);
    root.replaceChildren();
  };
};

function isTapRaceSnapshot(value: unknown): value is TapRaceSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { kind?: unknown; racers?: unknown };
  return candidate.kind === "tap-race" && Array.isArray(candidate.racers);
}
