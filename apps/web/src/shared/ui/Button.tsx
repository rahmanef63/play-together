import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "icon";

const LEGACY_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "primary-button",
  secondary: "secondary-button",
  outline: "secondary-button",
  ghost: "ghost-button",
  danger: "ghost-button danger",
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  busy = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  busy?: boolean;
  children: ReactNode;
}) {
  const classes = [
    "ds-button",
    `ds-button--${variant}`,
    `ds-button--${size}`,
    LEGACY_VARIANT_CLASSES[variant],
    fullWidth ? "ds-button--full full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      className={classes}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {children}
    </button>
  );
}
