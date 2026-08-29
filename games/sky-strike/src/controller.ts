import type { ControllerGameModule } from "@play-together/game-sdk";

interface S {
  kind: "sky-strike";
  phase: string;
  round: number;
  planes: Array<{ id: string; hp: number; kills: number; speed: number; lockId: string | null }>;
}
const ok = (v: unknown): v is S =>
  typeof v === "object" && v !== null && (v as any).kind === "sky-strike";
export const mountController: ControllerGameModule["mountController"] = (root, ctx) => {
  root.replaceChildren();
  const w = document.createElement("section");
  w.style.cssText =
    "height:100%;display:grid;grid-template-rows:auto 1fr;gap:8px;padding:8px;background:linear-gradient(#071524,#0c2940);color:white;font-family:system-ui;user-select:none";
  const hud = document.createElement("strong");
  const main = document.createElement("div");
  main.style.cssText = "display:grid;grid-template-columns:1.25fr .75fr;gap:10px;min-height:160px";
  const stick = document.createElement("div");
  stick.setAttribute("role", "application");
  stick.setAttribute("aria-label", "Flight stick");
  stick.style.cssText =
    "position:relative;border-radius:50%;background:radial-gradient(circle,#1f4b69 0 12%,#102b40 13% 60%,#0a1b2a 61%);touch-action:none;min-height:150px";
  const knob = document.createElement("div");
  knob.style.cssText =
    "position:absolute;left:50%;top:50%;width:27%;aspect-ratio:1;border-radius:50%;background:#cbd5e1;transform:translate(-50%,-50%);box-shadow:0 5px 18px #0008";
  stick.append(knob);
  const actions = document.createElement("div");
  actions.style.cssText =
    "display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:8px";
  const st = { pitch: 0, roll: 0, yaw: 0, throttle: 0.65, gun: false, missile: false };
  const clean: Array<() => void> = [];
  const send = () => ctx.sendInput({ ...st });
  const stickMove = (e: PointerEvent) => {
    const r = stick.getBoundingClientRect(),
      cx = r.left + r.width / 2,
      cy = r.top + r.height / 2,
      rad = Math.min(r.width, r.height) * 0.42,
      dx = e.clientX - cx,
      dy = e.clientY - cy,
      d = Math.hypot(dx, dy),
      k = d > rad ? rad / d : 1,
      x = dx * k,
      y = dy * k;
    st.roll = Math.max(-1, Math.min(1, x / rad));
    st.pitch = Math.max(-1, Math.min(1, -y / rad));
    knob.style.transform = `translate(calc(-50% + ${x}px),calc(-50% + ${y}px))`;
    send();
  };
  const down = (e: PointerEvent) => {
    stick.setPointerCapture(e.pointerId);
    stickMove(e);
  };
  const up = () => {
    st.roll = 0;
    st.pitch = 0;
    knob.style.transform = "translate(-50%,-50%)";
    send();
  };
  stick.addEventListener("pointerdown", down);
  stick.addEventListener("pointermove", (e) => {
    if (stick.hasPointerCapture(e.pointerId)) stickMove(e);
  });
  stick.addEventListener("pointerup", up);
  stick.addEventListener("pointercancel", up);
  const button = (text: string, aria: string, field: "gun" | "missile", style: string) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.setAttribute("aria-label", aria);
    b.style.cssText = `border:0;border-radius:50%;font:900 18px system-ui;touch-action:none;${style}`;
    const bd = (e: PointerEvent) => {
        b.setPointerCapture(e.pointerId);
        st[field] = true;
        send();
      },
      bu = () => {
        st[field] = false;
        send();
      };
    b.addEventListener("pointerdown", bd);
    b.addEventListener("pointerup", bu);
    b.addEventListener("pointercancel", bu);
    clean.push(() => {
      b.removeEventListener("pointerdown", bd);
      b.removeEventListener("pointerup", bu);
      b.removeEventListener("pointercancel", bu);
    });
    return b;
  };
  const throttle = (delta: number, label: string) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = delta > 0 ? "THR +" : "THR −";
    b.setAttribute("aria-label", label);
    b.style.cssText =
      "border:0;border-radius:16px;background:#dbeafe;color:#082f49;font-weight:900";
    b.onclick = () => {
      st.throttle = Math.max(0, Math.min(1, st.throttle + delta));
      send();
    };
    return b;
  };
  actions.append(
    button("GUN", "Fire cannon", "gun", "background:#f59e0b;color:#261500"),
    button("FOX 2", "Fire missile", "missile", "background:#ef4444;color:white"),
    throttle(0.1, "Increase throttle"),
    throttle(-0.1, "Decrease throttle"),
  );
  main.append(stick, actions);
  w.append(hud, main);
  root.append(w);
  const kd = (e: KeyboardEvent) => {
      if (["ArrowLeft", "a"].includes(e.key)) st.roll = -1;
      if (["ArrowRight", "d"].includes(e.key)) st.roll = 1;
      if (["ArrowUp", "w"].includes(e.key)) st.pitch = 1;
      if (["ArrowDown", "s"].includes(e.key)) st.pitch = -1;
      if (e.key === " ") st.gun = true;
      if (e.key === "Shift") st.missile = true;
      send();
    },
    ku = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "a", "d"].includes(e.key)) st.roll = 0;
      if (["ArrowUp", "ArrowDown", "w", "s"].includes(e.key)) st.pitch = 0;
      if (e.key === " ") st.gun = false;
      if (e.key === "Shift") st.missile = false;
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
    const me = m.state.planes.find((p) => p.id === ctx.playerId);
    hud.textContent = `SKY STRIKE · R${m.state.round} · HP ${Math.round(me?.hp ?? 0)} · KILLS ${me?.kills ?? 0} · ${Math.round((me?.speed ?? 0) * 3.6)} km/h · ${me?.lockId ? "LOCK" : "NO LOCK"}`;
  });
  return () => {
    unsub();
    clean.forEach((f) => {
      f();
    });
    root.replaceChildren();
  };
};
