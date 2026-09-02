import type { ReactNode } from "react";

export function EmptyState({
  title,
  body,
  className = "",
}: {
  title: ReactNode;
  body: ReactNode;
  className?: string;
}) {
  return (
    <div className={`empty-state ${className}`.trim()}>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}
