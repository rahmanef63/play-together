export const displayViewports = [
  { width: 360, height: 800 },
  { width: 667, height: 280 },
  { width: 740, height: 320 },
  { width: 844, height: 390 },
  { width: 915, height: 412 },
];

/** Bounds are relative to the actual nested screen, never the outer iframe viewport. */
export function measureDisplay() {
  const screen = document.querySelector(".console-shell__screen").getBoundingClientRect();
  const issues = [];
  const rect = (element) => {
    const b = element.getBoundingClientRect();
    return { x: b.x, y: b.y, width: b.width, height: b.height, right: b.right, bottom: b.bottom };
  };
  const inside = (a, b) =>
    a.x >= b.x - 2 && a.y >= b.y - 2 && a.right <= b.right + 2 && a.bottom <= b.bottom + 2;
  const overlap = (a, b) =>
    Math.min(a.right, b.right) - Math.max(a.x, b.x) > 2 &&
    Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 2;
  for (const canvas of document.querySelectorAll(".console-shell__screen canvas")) {
    const b = rect(canvas);
    if (b.width > 8 && !inside(b, screen)) issues.push("game-canvas-outside-screen");
  }
  if (innerWidth > innerHeight) {
    if (screen.width < innerWidth - 344) issues.push("excessive-side-rails");
    if (screen.height < innerHeight - 64) issues.push("excessive-vertical-framing");
    for (const control of document.querySelectorAll(
      ".console-control--button,.console-control--stick,.console-system-actions",
    )) {
      const b = rect(control);
      if (b.width && b.height && overlap(b, screen))
        issues.push("control-over-game:" + (control.dataset.controlId ?? "system"));
    }
  }
  const turbo = document.querySelector(".turbo-circuit");
  if (turbo) {
    if (!inside(rect(turbo), screen)) issues.push("turbo-root-outside-screen");
    const setup = turbo.dataset.phase === "setup";
    const panel = setup ? turbo.querySelector(".turbo-setup__panel") : null;
    const panelBounds = panel ? rect(panel) : null;
    const panelCanScroll = panel && panel.scrollHeight > panel.clientHeight + 1;
    const reachableInPanel = (node, bounds) => {
      if (!panel || !panelBounds || !panelCanScroll || node === panel || !panel.contains(node))
        return false;
      const contentTop = bounds.y - panelBounds.y + panel.scrollTop;
      const contentBottom = contentTop + bounds.height;
      return (
        bounds.x >= panelBounds.x - 2 &&
        bounds.right <= panelBounds.right + 2 &&
        contentTop >= -2 &&
        contentBottom <= panel.scrollHeight + 2
      );
    };
    const selectors = setup
      ? [".turbo-setup__panel", ".turbo-setup__footer", ".turbo-setup__help"]
      : [
          ".turbo-race-status",
          ".turbo-speedometer",
          ".turbo-nitro",
          ".turbo-camera",
          ".turbo-minimap",
          ".turbo-sound",
        ];
    const visible = [];
    for (const selector of selectors) {
      const node = turbo.querySelector(selector);
      if (!node || getComputedStyle(node).display === "none") continue;
      const b = rect(node);
      if (!inside(b, screen) && !reachableInPanel(node, b)) issues.push("clipped-hud:" + selector);
      if (!selector.includes("panel")) visible.push({ selector, ...b });
    }
    for (let i = 0; i < visible.length; i++)
      for (let j = i + 1; j < visible.length; j++)
        if (overlap(visible[i], visible[j]))
          issues.push("hud-overlap:" + visible[i].selector + ":" + visible[j].selector);
  }
  return {
    screen: rect(document.querySelector(".console-shell__screen")),
    drawCalls: Number(turbo?.dataset.drawCalls ?? 0),
    renderPixels: Number(turbo?.dataset.renderPixels ?? 0),
    issues,
  };
}
