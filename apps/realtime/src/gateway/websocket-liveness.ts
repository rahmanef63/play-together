import type { WebSocket } from "ws";

export const SOCKET_PING_INTERVAL_MS = 20_000;

export function monitorWebSocketLiveness(
  socket: WebSocket,
  intervalMs = SOCKET_PING_INTERVAL_MS,
): () => void {
  let alive = true;
  let stopped = false;
  const onPong = () => {
    alive = true;
  };
  const timer = setInterval(() => {
    if (stopped || socket.readyState !== socket.OPEN) return;
    if (!alive) {
      stop();
      socket.terminate();
      return;
    }
    alive = false;
    socket.ping();
  }, intervalMs);
  timer.unref();
  socket.on("pong", onPong);
  socket.once("close", stop);

  function stop(): void {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    socket.off("pong", onPong);
    socket.off("close", stop);
  }
  return stop;
}
