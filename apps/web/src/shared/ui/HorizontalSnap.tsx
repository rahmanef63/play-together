import type { ElementType, ReactNode } from "react";

export function HorizontalSnap({
  as: Component = "div",
  children,
  className = "",
  ariaLabel,
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Component className={`horizontal-snap ${className}`.trim()} aria-label={ariaLabel}>
      {children}
    </Component>
  );
}
