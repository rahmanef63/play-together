import type { CurrentUser } from "../../../shared/types";
import { AppTopbar } from "../../../shared/ui/AppTopbar";

const LOBBY_ACTIONS = [
  { label: "Pair device", href: "/device", className: "mobile-keep" },
  { label: "Templates", href: "/templates", className: "mobile-keep" },
  { label: "System", href: "/ops" },
] as const;

export function LobbyHeader({ user, onSignOut }: { user: CurrentUser; onSignOut: () => void }) {
  return (
    <AppTopbar
      actions={LOBBY_ACTIONS}
      end={
        <button className="avatar-button" type="button" onClick={onSignOut} title="Sign out">
          {initials(user.name)}
        </button>
      }
    />
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
