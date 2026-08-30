import { navigate } from "./navigation";

interface DockItem {
  label: string;
  path: string;
  icon: "home" | "rooms" | "templates" | "submit" | "system";
}

const ITEMS: DockItem[] = [
  { label: "Home", path: "/", icon: "home" },
  { label: "Rooms", path: "/rooms", icon: "rooms" },
  { label: "Templates", path: "/templates", icon: "templates" },
  { label: "Submit", path: "/developers", icon: "submit" },
  { label: "System", path: "/ops", icon: "system" },
];

export function AppDock({ path }: { path: string }) {
  return (
    <nav className="app-dock" aria-label="App navigation">
      <div className="app-dock__surface">
        {ITEMS.map((item) => {
          const active =
            item.path === "/"
              ? path === "/"
              : item.path === "/rooms"
                ? path === "/rooms" || path.startsWith("/room/")
                : path === item.path;
          return (
            <button
              key={item.path}
              type="button"
              className={`app-dock__item${active ? " app-dock__item--active" : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={() => navigate(item.path)}
            >
              <DockIcon name={item.icon} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function DockIcon({ name }: { name: DockItem["icon"] }) {
  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 10.8 12 3.7l8.5 7.1v8.7a1 1 0 0 1-1 1h-5.2v-6.1H9.7v6.1H4.5a1 1 0 0 1-1-1v-8.7Z" />
      </svg>
    );
  }
  if (name === "rooms") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5.2 5.1h13.6a2 2 0 0 1 2 2v8.4a2 2 0 0 1-2 2h-7.2l-4.7 3v-3H5.2a2 2 0 0 1-2-2V7.1a2 2 0 0 1 2-2Z" />
        <path d="M7.2 9.3h9.6M7.2 13.2h6.7" />
      </svg>
    );
  }
  if (name === "templates") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.4" y="4" width="7.3" height="7.3" rx="1.7" />
        <rect x="13.3" y="4" width="7.3" height="7.3" rx="1.7" />
        <rect x="3.4" y="13" width="7.3" height="7" rx="1.7" />
        <rect x="13.3" y="13" width="7.3" height="7" rx="1.7" />
      </svg>
    );
  }
  if (name === "submit") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 20V5.2" />
        <path d="m6.8 10.2 5.2-5.3 5.2 5.3" />
        <path d="M5 14.5v4a1.8 1.8 0 0 0 1.8 1.8h10.4a1.8 1.8 0 0 0 1.8-1.8v-4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.4a2 2 0 0 1 2 2v.5a6.8 6.8 0 0 1 1.7.7l.4-.4a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8l-.4.4c.3.5.5 1.1.7 1.7h.5a2 2 0 0 1 2 2v.6a2 2 0 0 1-2 2h-.5a6.8 6.8 0 0 1-.7 1.7l.4.4a2 2 0 0 1 0 2.8l-.4.4a2 2 0 0 1-2.8 0l-.4-.4a6.8 6.8 0 0 1-1.7.7v.5a2 2 0 0 1-2 2h-.6a2 2 0 0 1-2-2v-.5a6.8 6.8 0 0 1-1.7-.7l-.4.4a2 2 0 0 1-2.8 0l-.4-.4a2 2 0 0 1 0-2.8l.4-.4a6.8 6.8 0 0 1-.7-1.7h-.5a2 2 0 0 1-2-2V14a2 2 0 0 1 2-2h.5a6.8 6.8 0 0 1 .7-1.7l-.4-.4a2 2 0 0 1 0-2.8l.4-.4a2 2 0 0 1 2.8 0l.4.4a6.8 6.8 0 0 1 1.7-.7v-.5a2 2 0 0 1 2-2h.6Z" />
      <circle cx="12" cy="14" r="2.6" />
    </svg>
  );
}
