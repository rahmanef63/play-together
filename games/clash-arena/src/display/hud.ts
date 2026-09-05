import type { ArenaState, ViewFighter } from "./model.js";
export function makeHud(root: HTMLElement) {
  const host = document.createElement("section"),
    top = document.createElement("div"),
    left = document.createElement("div"),
    center = document.createElement("div"),
    right = document.createElement("div");
  host.style.cssText =
    "position:relative;width:100%;height:100%;overflow:hidden;background:#080b18;color:#fff;font:700 14px system-ui";
  top.style.cssText =
    "position:absolute;z-index:2;inset:12px 16px auto;display:grid;grid-template-columns:1fr auto 1fr;gap:12px;text-shadow:0 2px 3px #000;pointer-events:none";
  center.style.textAlign = "center";
  right.style.textAlign = "right";
  top.append(left, center, right);
  host.append(top);
  root.replaceChildren(host);
  return { host, left, center, right };
}
function bar(f: ViewFighter) {
  return `${f.name}${f.bot ? " · BOT" : ""}<br>♥ ${Math.ceil(f.hp)} <span style="color:#facc15">◆ ${Math.ceil(f.meter)}</span><br>${"●".repeat(f.wins)}${"○".repeat(2 - f.wins)}`;
}
export function hud(h: ReturnType<typeof makeHud>, s: ArenaState) {
  const [a, b] = s.fighters;
  h.left.innerHTML = a ? bar(a) : "WAITING";
  h.right.innerHTML = b ? bar(b) : "WAITING";
  h.center.textContent =
    s.phase === "fight" ? `${s.round} · ${Math.ceil(s.timerMs / 1000)}` : s.event;
}
