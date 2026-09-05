/** Executed in the browser realm by Playwright. */
export function measureControls() {
  const elements = [
    ...document.querySelectorAll(".console-control--button,.console-control--stick"),
  ];
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
    if (box.width < 43 || box.height < 29 || (/^[lr][12]$/.test(box.face ?? "") && box.height < 43))
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
  return { boxes, issues };
}
