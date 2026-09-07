import { type RefObject, useEffect, useRef } from "react";
export function useMenuFocus(open: boolean, ref: RefObject<HTMLElement | null>, close: () => void) {
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  }, [close]);
  useEffect(() => {
    const panel = ref.current;
    if (!open || !panel) return;
    const previous = document.activeElement as HTMLElement | null;
    const buttons = () =>
      Array.from(panel.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
    buttons()[0]?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const choices = buttons(),
        first = choices[0],
        last = choices.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    panel.addEventListener("keydown", key);
    return () => {
      panel.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [open, ref]);
}
