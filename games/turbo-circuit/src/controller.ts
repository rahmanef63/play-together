import type { ControllerGameModule } from "@play-together/game-sdk";

interface S {
  kind: "turbo-circuit";
  phase: string;
  countdownMs: number;
  racers: Array<{ id: string; speed: number; lap: number; nitro: number }>;
}
const ok = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as any).kind === "turbo-circuit";
export const mountController: ControllerGameModule["mountController"] = (root, ctx) => {
  root.replaceChildren();
  const wrap = document.createElement("section");
  wrap.className = "turbo-controller";
  wrap.style.cssText =
    "height:100%;display:grid;grid-template-rows:auto 1fr;gap:8px;padding:8px;background:linear-gradient(135deg,#070b13,#151a24);color:white;font-family:system-ui;user-select:none";
  const hud = document.createElement("div");
  hud.style.cssText =
    "display:flex;justify-content:space-between;font-weight:900;letter-spacing:.04em";
  const controls = document.createElement("div");
  controls.style.cssText =
    "display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;min-height:150px";
  const steer = document.createElement("div");
  steer.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:8px";
  const pedals = document.createElement("div");
  pedals.style.cssText = "display:grid;grid-template-rows:1.6fr 1fr;gap:8px";
  const boost = document.createElement("div");
  boost.style.cssText = "display:grid;place-items:center";
  const state = { steer: 0, throttle: 0, brake: 0, boost: false };
  const clean: Array<() => void> = [];
  const send = () => ctx.sendInput({ ...state });
  const hold = (label: string, aria: string, on: () => void, off: () => void, style: string) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.setAttribute("aria-label", aria);
    b.style.cssText = `border:0;border-radius:22px;font:900 clamp(22px,7vw,42px) system-ui;touch-action:none;${style}`;
    const down = (e: PointerEvent) => {
      b.setPointerCapture(e.pointerId);
      on();
      send();
    };
    const up = () => {
      off();
      send();
    };
    b.addEventListener("pointerdown", down);
    b.addEventListener("pointerup", up);
    b.addEventListener("pointercancel", up);
    clean.push(() => {
      b.removeEventListener("pointerdown", down);
      b.removeEventListener("pointerup", up);
      b.removeEventListener("pointercancel", up);
    });
    return b;
  };
  steer.append(
    hold(
      "◀",
      "Steer left",
      () => (state.steer = -1),
      () => (state.steer = 0),
      "background:#e5e7eb;color:#111827",
    ),
    hold(
      "▶",
      "Steer right",
      () => (state.steer = 1),
      () => (state.steer = 0),
      "background:#e5e7eb;color:#111827",
    ),
  );
  pedals.append(
    hold(
      "GAS",
      "Accelerate",
      () => (state.throttle = 1),
      () => (state.throttle = 0),
      "background:#22c55e;color:#04130a",
    ),
    hold(
      "BRAKE",
      "Brake",
      () => (state.brake = 1),
      () => (state.brake = 0),
      "background:#ef4444;color:white",
    ),
  );
  boost.append(
    hold(
      "N₂O",
      "Nitro boost",
      () => (state.boost = true),
      () => (state.boost = false),
      "width:100%;height:100%;background:#38bdf8;color:#03202d;border-radius:50%",
    ),
  );
  controls.append(steer, pedals, boost);
  wrap.append(hud, controls);
  root.append(wrap);
  const kd = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (["ArrowLeft", "a", "A"].includes(e.key)) state.steer = -1;
    if (["ArrowRight", "d", "D"].includes(e.key)) state.steer = 1;
    if (["ArrowUp", "w", "W"].includes(e.key)) state.throttle = 1;
    if (["ArrowDown", "s", "S"].includes(e.key)) state.brake = 1;
    if (e.key === " ") state.boost = true;
    send();
  };
  const ku = (e: KeyboardEvent) => {
    if (["ArrowLeft", "ArrowRight", "a", "A", "d", "D"].includes(e.key)) state.steer = 0;
    if (["ArrowUp", "w", "W"].includes(e.key)) state.throttle = 0;
    if (["ArrowDown", "s", "S"].includes(e.key)) state.brake = 0;
    if (e.key === " ") state.boost = false;
    send();
  };
  window.addEventListener("keydown", kd);
  window.addEventListener("keyup", ku);
  clean.push(() => {
    window.removeEventListener("keydown", kd);
    window.removeEventListener("keyup", ku);
  });
  const unsub = ctx.subscribe((m) => {
    if (!ok(m.state)) return;
    const me = m.state.racers.find((r) => r.id === ctx.playerId);
    hud.textContent = `TURBO CIRCUIT · ${m.state.phase === "countdown" ? Math.ceil(m.state.countdownMs / 1000) : `LAP ${(me?.lap ?? 0) + 1}/3`} · ${Math.round((me?.speed ?? 0) * 4.2)} km/h · N₂O ${Math.round(me?.nitro ?? 0)}%`;
  });
  return () => {
    unsub();
    clean.forEach((f) => {
      f();
    });
    root.replaceChildren();
  };
};
