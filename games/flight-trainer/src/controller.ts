import type { ControllerGameModule } from "@play-together/game-sdk";

interface S {
  kind: "flight-trainer";
  aircraft: Array<{
    id: string;
    airspeed: number;
    y: number;
    verticalSpeed: number;
    throttle: number;
    flaps: boolean;
    gearDown: boolean;
    stall: boolean;
    crashed: boolean;
    landed: boolean;
    missionComplete: boolean;
    nextCheckpoint: number;
    score: number;
  }>;
}
const ok = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as any).kind === "flight-trainer";
export const mountController: ControllerGameModule["mountController"] = (root, ctx) => {
  root.replaceChildren();
  const w = document.createElement("section");
  w.style.cssText =
    "height:100%;display:grid;grid-template-rows:auto 1fr;gap:8px;padding:8px;background:linear-gradient(#111827,#1e293b);color:white;font-family:system-ui;user-select:none";
  const hud = document.createElement("strong"),
    main = document.createElement("div");
  main.style.cssText = "display:grid;grid-template-columns:1.15fr .85fr;gap:10px;min-height:165px";
  const stick = document.createElement("div");
  stick.setAttribute("role", "application");
  stick.setAttribute("aria-label", "Flight yoke");
  stick.style.cssText =
    "position:relative;border-radius:28px;background:radial-gradient(circle,#334155,#0f172a 70%);touch-action:none;overflow:hidden";
  const knob = document.createElement("div");
  knob.style.cssText =
    "position:absolute;left:50%;top:50%;width:29%;aspect-ratio:1;border-radius:50%;background:#e2e8f0;transform:translate(-50%,-50%);box-shadow:0 8px 22px #0009";
  stick.append(knob);
  const panel = document.createElement("div");
  panel.style.cssText =
    "display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr 1fr;gap:7px";
  const st = { pitch: 0, roll: 0, yaw: 0, throttle: 0, flaps: false, gear: true, restart: false };
  const send = () => ctx.sendInput({ ...st });
  const clean: Array<() => void> = [];
  const move = (e: PointerEvent) => {
    const r = stick.getBoundingClientRect(),
      cx = r.left + r.width / 2,
      cy = r.top + r.height / 2,
      rx = r.width * 0.38,
      ry = r.height * 0.38,
      dx = Math.max(-rx, Math.min(rx, e.clientX - cx)),
      dy = Math.max(-ry, Math.min(ry, e.clientY - cy));
    st.roll = dx / rx;
    st.pitch = -dy / ry;
    knob.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
    send();
  };
  const down = (e: PointerEvent) => {
      stick.setPointerCapture(e.pointerId);
      move(e);
    },
    up = () => {
      st.roll = 0;
      st.pitch = 0;
      knob.style.transform = "translate(-50%,-50%)";
      send();
    };
  stick.addEventListener("pointerdown", down);
  stick.addEventListener("pointermove", (e) => {
    if (stick.hasPointerCapture(e.pointerId)) move(e);
  });
  stick.addEventListener("pointerup", up);
  stick.addEventListener("pointercancel", up);
  const b = (text: string, aria: string, fn: () => void, color = "#cbd5e1") => {
    const x = document.createElement("button");
    x.type = "button";
    x.textContent = text;
    x.setAttribute("aria-label", aria);
    x.style.cssText = `border:0;border-radius:14px;background:${color};color:#0f172a;font-weight:900`;
    x.onclick = () => {
      fn();
      send();
    };
    return x;
  };
  panel.append(
    b("THR +", "Throttle up", () => (st.throttle = Math.min(1, st.throttle + 0.12)), "#86efac"),
    b("THR −", "Throttle down", () => (st.throttle = Math.max(0, st.throttle - 0.12)), "#fecaca"),
    b("YAW ◀", "Yaw left", () => {
      st.yaw = -1;
      setTimeout(() => {
        st.yaw = 0;
        send();
      }, 180);
    }),
    b("YAW ▶", "Yaw right", () => {
      st.yaw = 1;
      setTimeout(() => {
        st.yaw = 0;
        send();
      }, 180);
    }),
    b("FLAPS", "Toggle flaps", () => (st.flaps = !st.flaps), "#fde68a"),
    b("GEAR", "Toggle landing gear", () => (st.gear = !st.gear), "#bfdbfe"),
  );
  main.append(stick, panel);
  const reset = b(
    "RESTART",
    "Restart flight",
    () => {
      st.restart = true;
      send();
      st.restart = false;
    },
    "#fca5a5",
  );
  reset.style.cssText += ";position:absolute;right:10px;top:36px;padding:5px 9px;display:none";
  w.style.position = "relative";
  w.append(hud, main, reset);
  root.append(w);
  const kd = (e: KeyboardEvent) => {
      if (["ArrowLeft", "a"].includes(e.key)) st.roll = -1;
      if (["ArrowRight", "d"].includes(e.key)) st.roll = 1;
      if (["ArrowUp", "w"].includes(e.key)) st.pitch = 1;
      if (["ArrowDown", "s"].includes(e.key)) st.pitch = -1;
      if (e.key === "q") st.yaw = -1;
      if (e.key === "e") st.yaw = 1;
      if (e.key === "+") st.throttle = Math.min(1, st.throttle + 0.1);
      if (e.key === "-") st.throttle = Math.max(0, st.throttle - 0.1);
      send();
    },
    ku = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "a", "d"].includes(e.key)) st.roll = 0;
      if (["ArrowUp", "ArrowDown", "w", "s"].includes(e.key)) st.pitch = 0;
      if (["q", "e"].includes(e.key)) st.yaw = 0;
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
    const a = m.state.aircraft.find((x) => x.id === ctx.playerId);
    if (!a) return;
    hud.textContent = `FLIGHT TRAINER · ${Math.round(a.airspeed * 1.94)} kt · ALT ${Math.round(a.y)} m · VSI ${a.verticalSpeed.toFixed(1)} · THR ${Math.round(a.throttle * 100)}% · CP ${a.nextCheckpoint}/6${a.stall ? " · STALL!" : ""}`;
    reset.style.display = a.crashed ? "block" : "none";
  });
  return () => {
    unsub();
    clean.forEach((f) => {
      f();
    });
    root.replaceChildren();
  };
};
