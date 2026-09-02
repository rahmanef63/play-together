import type { ReactNode } from "react";
import { navigate } from "../navigation";
import { Button } from "./Button";

export interface TopbarAction {
  label: string;
  href: string;
  className?: string;
}

export function AppTopbar({
  actions = [],
  end,
  className = "",
}: {
  actions?: readonly TopbarAction[];
  end?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`topbar desktop-topbar ${className}`.trim()}>
      <button className="brand-button" type="button" onClick={() => navigate("/")}>
        <span>PT</span> Play Together
      </button>
      <nav>
        {actions.map((action) => (
          <Button
            key={`${action.href}:${action.label}`}
            type="button"
            variant="ghost"
            className={action.className}
            onClick={() => navigate(action.href)}
          >
            {action.label}
          </Button>
        ))}
        {end}
      </nav>
    </header>
  );
}
