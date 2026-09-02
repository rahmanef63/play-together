import type { ReactNode } from "react";

export function SectionTitle({
  label,
  title,
  meta,
  className = "",
  labelClassName = "eyebrow",
  titleId,
  metaClassName = "",
}: {
  label?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  className?: string;
  labelClassName?: string;
  titleId?: string;
  metaClassName?: string;
}) {
  return (
    <div className={`section-title ${className}`.trim()}>
      <div>
        {label ? <p className={labelClassName}>{label}</p> : null}
        <h2 id={titleId}>{title}</h2>
      </div>
      {meta !== undefined && meta !== null ? <span className={metaClassName}>{meta}</span> : null}
    </div>
  );
}
