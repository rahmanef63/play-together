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
    "width:100%;height:100%;display:grid;gap:16px;align-items:stretch;touch-action:none;user-select:none;-webkit-user-select:none";

  const screen = document.createElement("section");
  screen.setAttribute("aria-label", "Tap Race handheld screen");
  screen.style.cssText =
    "min-height:180px;border-radius:20px;background:#10162f;color:#f8f6ff;padding:20px;display:grid;align-content:center;gap:14px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)";
  const round = document.createElement("strong");
  round.style.cssText =
    "font:800 12px/1 system-ui;letter-spacing:.16em;text-transform:uppercase;color:#b8b5d8";
  const status = document.createElement("div");
  status.style.cssText = "font:900 clamp(22px,7vw,42px)/1 system-ui;letter-spacing:-.04em";
  const track = document.createElement("div");
  track.style.cssText = "height:22px;border-radius:999px;background:#292d4e;overflow:hidden";
  const progress = document.createElement("div");
  progress.style.cssText =
    "height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,#78f2a5,#d5ff80);transition:width .08s linear";
  track.append(progress);
  const progressText = document.createElement("span");
  progressText.style.cssText = "font:700 14px/1 ui-monospace,monospace;color:#dcd9ff";
  screen.append(round, status, track, progressText);

  const controls = document.createElement("section");
  controls.style.cssText = "display:grid;place-items:stretch;min-height:190px";
  const tap = document.createElement("button");
  tap.type = "button";
  tap.textContent = "TAP";
  tap.setAttribute("aria-label", "Tap to race");
  tap.style.cssText =
    "appearance:none;border:0;border-radius:50%;aspect-ratio:1;max-height:min(52vh,340px);max-width:min(80vw,340px);width:100%;align-self:center;justify-self:center;background:#ffcf5a;color:#17120a;font:950 clamp(46px,17vw,96px)/1 system-ui;letter-spacing:-.08em;box-shadow:0 13px 0 #b87818,0 22px 50px rgba(0,0,0,.28);touch-action:manipulation;transition:transform .05s ease,box-shadow .05s ease";
  controls.append(tap);
  if (context.mode === "handheld") shell.append(screen, controls);
  else shell.append(controls);
  root.append(shell);

  const landscape = matchMedia("(orientation: landscape)");
  const arrange = () => {
    if (context.mode !== "handheld") {
      shell.style.gridTemplateColumns = "1fr";
      shell.style.gridTemplateRows = "1fr";
      return;
    }
    if (landscape.matches) {
      shell.style.gridTemplateColumns = "minmax(0,2.2fr) minmax(180px,.8fr)";
      shell.style.gridTemplateRows = "1fr";
    } else {
      shell.style.gridTemplateColumns = "1fr";
      shell.style.gridTemplateRows = "minmax(180px,1fr) minmax(190px,.85fr)";
    }
  };
  arrange();
  landscape.addEventListener("change", arrange);

  let pointerDown = false;
  const sendTap = () => {
    context.sendInput({ action: "tap" });
    navigator.vibrate?.(7);
    tap.style.transform = "translateY(8px) scale(.985)";
    tap.style.boxShadow = "0 5px 0 #b87818,0 12px 28px rgba(0,0,0,.24)";
    setTimeout(() => {
      tap.style.transform = "";
      tap.style.boxShadow = "0 13px 0 #b87818,0 22px 50px rgba(0,0,0,.28)";
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
    const amount = racer?.progress ?? 0;
    round.textContent = `Round ${state.round}`;
    status.textContent =
      state.winnerId === context.playerId
        ? "YOU WIN"
        : state.phase === "finished"
          ? "ROUND OVER"
          : racer
            ? "RACE!"
            : "SPECTATING";
    progress.style.width = `${amount}%`;
    progressText.textContent = `${Math.round(amount)} / 100`;
  });
  context.setStatus(
    context.mode === "handheld" ? "Tap Race handheld ready" : "Tap Race remote ready",
  );

  return () => {
    unsubscribe();
    landscape.removeEventListener("change", arrange);
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
