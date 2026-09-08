/** Executed in the browser realm by Playwright. */
export function measureControls() {
  const candidates = [
    ...document.querySelectorAll(".console-control--button,.console-control--stick"),
  ];
  const elements = candidates.filter((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0.5 && rect.height > 0.5 && getComputedStyle(element).display !== "none";
  });
  const boxes = elements.map((element) => {
    const rect = element.getBoundingClientRect();
    const visibleAtCenter = document.elementFromPoint(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
    );
    return {
      id: element.dataset.controlId,
      face: element.dataset.face,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      accessible: visibleAtCenter === element || element.contains(visibleAtCenter),
    };
  });
  const issues = [];
  for (const box of boxes) {
    if (box.width < 43 || box.height < 29)
      issues.push(`undersized:${box.id}:${box.width.toFixed(1)}x${box.height.toFixed(1)}`);
    if (
      box.x < -1 ||
      box.y < -1 ||
      box.x + box.width > innerWidth + 1 ||
      box.y + box.height > innerHeight + 1
    )
      issues.push(`clipped:${box.id}`);
    if (!box.accessible) issues.push(`obscured:${box.id}`);
  }
  for (let a = 0; a < boxes.length; a++)
    for (let b = a + 1; b < boxes.length; b++) {
      const one = boxes[a],
        two = boxes[b];
      const width = Math.min(one.x + one.width, two.x + two.width) - Math.max(one.x, two.x);
      const height = Math.min(one.y + one.height, two.y + two.height) - Math.max(one.y, two.y);
      if (width > 2 && height > 2) issues.push(`overlap:${one.id}:${two.id}`);
    }
  const system = [...document.querySelectorAll(".console-system-actions > .console-system-button")]
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0.5 && rect.height > 0.5 && getComputedStyle(element).display !== "none";
    })
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return {
        accessible: hit === element || element.contains(hit),
        label: element.getAttribute("aria-label"),
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      };
    });
  const labels = system.map((item) => item.label);
  if (!labels.includes("How to play")) issues.push("missing:how-to");
  if (!labels.includes("Open game menu")) issues.push("missing:menu");
  for (const item of system) {
    if (!item.accessible) issues.push("obscured:system:" + item.label);
    if (item.width < 43 || item.height < 29) issues.push(`undersized:system:${item.label}`);
    if (
      item.x < -1 ||
      item.y < -1 ||
      item.x + item.width > innerWidth + 1 ||
      item.y + item.height > innerHeight + 1
    )
      issues.push(`clipped:system:${item.label}`);
  }
  const start = document.querySelector('[data-face="start"],[data-face="pause"]');
  const actions = document.querySelector(".console-system-actions");
  if (start && actions) {
    const a = actions.getBoundingClientRect(),
      s = start.getBoundingClientRect();
    if (matchMedia("(orientation: portrait)").matches) {
      if (a.bottom > s.top + 3) issues.push("system-actions:not-above-start");
    } else if (Math.abs(a.y + a.height / 2 - (s.y + s.height / 2)) > Math.max(24, s.height * 0.6)) {
      issues.push("system-actions:not-beside-start");
    }
  }
  const selectable = [
    ...document.querySelectorAll(".builtin-controller button,.builtin-controller button *"),
  ].filter((element) => getComputedStyle(element).userSelect !== "none");
  if (selectable.length) issues.push(`selectable:${selectable.length}`);
  const hiddenShoulders = [...document.querySelectorAll('[data-shoulder="true"]')].filter(
    (element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0.5 && rect.height > 0.5 && getComputedStyle(element).display !== "none";
    },
  );
  if (
    hiddenShoulders.length &&
    document.querySelector('.builtin-controller[data-advanced-controls="false"]')
  )
    issues.push(`shoulders-visible-by-default:${hiddenShoulders.length}`);
  return { boxes, system, issues };
}
