import type { ReactNode } from "react";
import { ScrollArea } from "../ScrollArea";
import { AppTopbar, type TopbarAction } from "./AppTopbar";

export function ScrollableAppPage({
  children,
  ariaLabel,
  className = "",
  scrollClassName = "",
  contentClassName = "",
  topbarActions = [],
  topbarEnd,
  topbarClassName = "",
}: {
  children: ReactNode;
  ariaLabel: string;
  className?: string;
  scrollClassName?: string;
  contentClassName?: string;
  topbarActions?: readonly TopbarAction[];
  topbarEnd?: ReactNode;
  topbarClassName?: string;
}) {
  return (
    <main className={`app-shell scrollable-app-page ${className}`.trim()}>
      <AppTopbar actions={topbarActions} end={topbarEnd} className={topbarClassName} />
      <ScrollArea
        className={`scrollable-app-page__scroll ${scrollClassName}`.trim()}
        ariaLabel={ariaLabel}
      >
        <div className={`scrollable-app-page__content ${contentClassName}`.trim()}>{children}</div>
      </ScrollArea>
    </main>
  );
}
