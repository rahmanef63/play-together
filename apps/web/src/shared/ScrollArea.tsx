import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

interface ScrollMetrics {
  visible: boolean;
  thumbRatio: number;
  thumbOffset: number;
}

const EMPTY_METRICS: ScrollMetrics = { visible: false, thumbRatio: 1, thumbOffset: 0 };

export function ScrollArea({
  children,
  className = "",
  viewportClassName = "",
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  ariaLabel?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<ScrollMetrics>(EMPTY_METRICS);

  const updateMetrics = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const { clientHeight, scrollHeight, scrollTop } = viewport;
    if (clientHeight <= 0 || scrollHeight <= clientHeight + 1) {
      setMetrics(EMPTY_METRICS);
      return;
    }
    const thumbRatio = Math.max(0.12, Math.min(1, clientHeight / scrollHeight));
    const scrollRange = Math.max(1, scrollHeight - clientHeight);
    const thumbOffset = Math.max(0, Math.min(1, scrollTop / scrollRange));
    setMetrics({ visible: true, thumbRatio, thumbOffset });
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(updateMetrics);
    observer.observe(viewport);
    for (const child of Array.from(viewport.children)) observer.observe(child);
    viewport.addEventListener("scroll", updateMetrics, { passive: true });
    updateMetrics();
    return () => {
      observer.disconnect();
      viewport.removeEventListener("scroll", updateMetrics);
    };
  }, [updateMetrics]);

  const thumbTravelPercent = metrics.thumbOffset * ((1 / metrics.thumbRatio - 1) * 100);
  const style = {
    "--scroll-thumb-ratio": metrics.thumbRatio,
    "--scroll-thumb-offset": `${thumbTravelPercent}%`,
  } as CSSProperties;

  return (
    <div className={`scroll-area ${className}`.trim()} style={style}>
      <section
        ref={viewportRef}
        className={`scroll-area__viewport ${viewportClassName}`.trim()}
        aria-label={ariaLabel ?? "Scrollable content"}
      >
        {children}
      </section>
      <span
        className={`scroll-area__track${metrics.visible ? " scroll-area__track--visible" : ""}`}
        aria-hidden="true"
      >
        <span className="scroll-area__thumb" />
      </span>
    </div>
  );
}
