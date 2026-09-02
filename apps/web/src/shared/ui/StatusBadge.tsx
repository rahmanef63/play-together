import type { ReactNode } from "react";

export function StatusBadge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={`status-badge ${className}`.trim()}>{children}</span>;
}
