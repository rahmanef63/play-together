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
  const frameRef = useRef(0);
  const [metrics, setMetrics] = useState<ScrollMetrics>(EMPTY_METRICS);

  const measure = useCallback(() => {
    frameRef.current = 0;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const { clientHeight, scrollHeight, scrollTop } = viewport;
    const next: ScrollMetrics =
      clientHeight <= 0 || scrollHeight <= clientHeight + 1
        ? EMPTY_METRICS
        : {
            visible: true,
            thumbRatio: Math.max(0.12, Math.min(1, clientHeight / scrollHeight)),
            thumbOffset: Math.max(
              0,
              Math.min(1, scrollTop / Math.max(1, scrollHeight - clientHeight)),
            ),
          };
    setMetrics((previous) =>
      previous.visible === next.visible &&
      Math.abs(previous.thumbRatio - next.thumbRatio) < 0.001 &&
      Math.abs(previous.thumbOffset - next.thumbOffset) < 0.001
        ? previous
        : next,
    );
  }, []);

  const scheduleMeasure = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(measure);
  }, [measure]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const resizeObserver = new ResizeObserver(scheduleMeasure);
    const observeChildren = () => {
      resizeObserver.disconnect();
      resizeObserver.observe(viewport);
      for (const child of Array.from(viewport.children)) resizeObserver.observe(child);
    };
    observeChildren();
    const mutationObserver = new MutationObserver(() => {
      observeChildren();
      scheduleMeasure();
    });
    mutationObserver.observe(viewport, { childList: true });
    viewport.addEventListener("scroll", scheduleMeasure, { passive: true });
    scheduleMeasure();
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      viewport.removeEventListener("scroll", scheduleMeasure);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };
  }, [scheduleMeasure]);

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
        data-scroll-viewport
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
