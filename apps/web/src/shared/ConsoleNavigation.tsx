import { useEffect } from "react";
import { browserSupport } from "./browserSupport";

export function ConsoleNavigation({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    document.documentElement.dataset.tv = String(browserSupport().tv);
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const directions: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const direction = directions[event.key];
      if (!direction) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)))
        return;
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(
          'main button:not([disabled]),main a[href],main input:not([disabled]),main select:not([disabled]),main [tabindex="0"]',
        ),
      ).filter((element) => {
        const rect = element.getBoundingClientRect();
        return (
          rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== "hidden"
        );
      });
      const origin = active?.getBoundingClientRect();
      let next: HTMLElement | undefined;
      if (!origin || !candidates.includes(active!)) next = candidates[0];
      else {
        const ox = origin.left + origin.width / 2,
          oy = origin.top + origin.height / 2;
        let score = Infinity;
        for (const candidate of candidates) {
          if (candidate === active) continue;
          const rect = candidate.getBoundingClientRect(),
            dx = rect.left + rect.width / 2 - ox,
            dy = rect.top + rect.height / 2 - oy;
          const along = dx * direction[0] + dy * direction[1],
            across = Math.abs(dx * direction[1] - dy * direction[0]);
          if (along <= 2) continue;
          const distance = along + across * 3;
          if (distance < score) {
            score = distance;
            next = candidate;
          }
        }
      }
      if (next) {
        event.preventDefault();
        next.focus({ preventScroll: true });
        next.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
  return null;
}
