import type { ReactNode } from "react";

export function FormMessage({
  children,
  variant = "error",
}: {
  children: ReactNode;
  variant?: "error" | "notice";
}) {
  return (
    <p
      className={variant === "error" ? "form-error" : "form-notice"}
      role={variant === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
