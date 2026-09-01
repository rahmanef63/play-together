export const realtimeUrl = import.meta.env.VITE_REALTIME_URL || defaultRealtimeUrl();
export const realtimeHealthUrl = toHttpUrl(realtimeUrl);

function defaultRealtimeUrl(): string {
  const endpoint = new URL("/api/realtime", window.location.origin);
  endpoint.protocol = endpoint.protocol === "https:" ? "wss:" : "ws:";
  return endpoint.toString();
}

function toHttpUrl(value: string): string {
  const endpoint = new URL(value, window.location.origin);
  endpoint.protocol = endpoint.protocol === "wss:" ? "https:" : "http:";
  return endpoint.toString();
}
