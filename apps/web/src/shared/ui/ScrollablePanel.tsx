import type { ElementType, ReactNode } from "react";
import { ScrollArea } from "../ScrollArea";
import { SectionTitle } from "./SectionTitle";

export function ScrollablePanel({
  as: Component = "section",
  label,
  title,
  meta,
  ariaLabel,
  children,
  toolbar,
  className = "",
  titleClassName = "",
  labelClassName,
  metaClassName,
  scrollClassName = "",
  contentClassName = "panel-scroll__content",
}: {
  as?: ElementType;
  label?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  ariaLabel: string;
  children: ReactNode;
  toolbar?: ReactNode;
  className?: string;
  titleClassName?: string;
  labelClassName?: string;
  metaClassName?: string;
  scrollClassName?: string;
  contentClassName?: string;
}) {
  return (
    <Component
      className={`panel panel-frame${toolbar ? " panel-frame--with-toolbar" : ""} ${className}`.trim()}
    >
      <SectionTitle
        label={label}
        title={title}
        meta={meta}
        className={titleClassName}
        labelClassName={labelClassName ?? "eyebrow"}
        metaClassName={metaClassName ?? ""}
      />
      {toolbar}
      <ScrollArea className={`panel-scroll ${scrollClassName}`.trim()} ariaLabel={ariaLabel}>
        <div className={contentClassName}>{children}</div>
      </ScrollArea>
    </Component>
  );
}
