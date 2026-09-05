const MSO_COMPONENT_ORIGIN = "https://mso-ui.rahmanef.com";

/** Report a mounted, usable app shell; never include auth, player or room state. */
export function notifyEmbedReady(): void {
  const path = window.location.pathname;
  if (window.parent === window || !(path === "/embed" || path.startsWith("/embed/"))) return;
  window.parent.postMessage(
    { type: "play-together:embed-ready", schemaVersion: 1 },
    MSO_COMPONENT_ORIGIN,
  );
}
