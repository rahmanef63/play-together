export const realtimeUrl = import.meta.env.VITE_REALTIME_URL || defaultRealtimeUrl();

function defaultRealtimeUrl(): string {
  const endpoint = new URL("/api/realtime", window.location.origin);
  endpoint.protocol = endpoint.protocol === "https:" ? "wss:" : "ws:";
  return endpoint.toString();
}
