import { useAuthActions } from "@convex-dev/auth/react";
import { useEffect, useId, useRef, useState } from "react";
import { navigate } from "./navigation";
import type { CurrentUser } from "./types";
import { Button } from "./ui/Button";

export function MobileAccountMenu({ user }: { user: CurrentUser }) {
  const { signOut } = useAuthActions();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    rootRef.current?.querySelector<HTMLButtonElement>(".mobile-account__menu button")?.focus();
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    const blur = (event: FocusEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", key);
    window.addEventListener("focusin", blur);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", key);
      window.removeEventListener("focusin", blur);
    };
  }, [open]);

  return (
    <div className="mobile-account" ref={rootRef}>
      <button
        ref={triggerRef}
        className="mobile-account__trigger"
        type="button"
        aria-label={open ? "Close account menu" : "Open account menu"}
        aria-controls={panelId}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {initials(user.name)}
      </button>
      {open && (
        <section id={panelId} className="mobile-account__menu" aria-label="Account">
          <div className="mobile-account__identity">
            <strong>{user.name}</strong>
            {user.email && <span>{user.email}</span>}
          </div>
          <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={() => {
              setOpen(false);
              navigate("/device");
            }}
          >
            Sign in another device
          </Button>
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
        </section>
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
