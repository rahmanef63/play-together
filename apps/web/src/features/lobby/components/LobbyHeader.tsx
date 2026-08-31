import { navigate } from "../../../shared/navigation";
import type { CurrentUser } from "../../../shared/types";

export function LobbyHeader({ user, onSignOut }: { user: CurrentUser; onSignOut: () => void }) {
  return (
    <header className="topbar desktop-topbar">
      <button className="brand-button" type="button" onClick={() => navigate("/")}>
        <span>PT</span> Play Together
      </button>
      <nav>
        <button
          className="ghost-button mobile-keep"
          type="button"
          onClick={() => navigate("/templates")}
        >
          Templates
        </button>
        <button className="ghost-button" type="button" onClick={() => navigate("/ops")}>
          System
        </button>
        <button className="avatar-button" type="button" onClick={onSignOut} title="Sign out">
          {initials(user.name)}
        </button>
      </nav>
    </header>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
