/** Report a mounted, usable app shell; never include auth, player or room state. */
export function notifyEmbedReady(): void {
  const path = window.location.pathname;
  if (window.parent === window || !(path === "/embed" || path.startsWith("/embed/"))) return;
  // The host may serve the component on its own sandbox origin rather than the
  // domain in MCP metadata. This constant, public lifecycle marker carries no
  // credentials or game state. The receiver must validate source + game origin.
  window.parent.postMessage({ type: "play-together:embed-ready", schemaVersion: 1 }, "*");
}
