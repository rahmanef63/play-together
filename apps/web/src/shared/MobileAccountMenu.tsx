import { useAuthActions } from "@convex-dev/auth/react";
import { useEffect, useRef, useState } from "react";
import type { CurrentUser } from "./types";
import { Button } from "./ui/Button";

export function MobileAccountMenu({ user }: { user: CurrentUser }) {
  const { signOut } = useAuthActions();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div className="mobile-account" ref={rootRef}>
      <button
        className="mobile-account__trigger"
        type="button"
        aria-label="Open account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {initials(user.name)}
      </button>
      {open && (
        <div className="mobile-account__menu" role="menu">
          <div className="mobile-account__identity">
            <strong>{user.name}</strong>
            {user.email && <span>{user.email}</span>}
          </div>
          <Button
            type="button"
            variant="danger"
            fullWidth
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
          >
            Sign out
          </Button>
        </div>
      )}
    </div>
  );
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "P"
  );
}
