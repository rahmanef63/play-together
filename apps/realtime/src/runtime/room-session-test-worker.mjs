import { parentPort } from "node:worker_threads";

if (!parentPort) throw new Error("Test worker requires a parent port");

const players = new Map();
let tick = 0;
const timer = setInterval(() => {
  tick += 1;
  parentPort.postMessage({
    type: "snapshot",
    tick,
    serverTime: Date.now(),
    state: { players: [...players.entries()].map(([id, x]) => ({ id, x })) },
  });
}, 20);
timer.unref();

parentPort.on("message", (message) => {
  if (message.type === "join") players.set(message.playerId, players.get(message.playerId) ?? 0);
  else if (message.type === "leave") players.delete(message.playerId);
  else if (message.type === "input") {
    const steer = Number(message.payload?.steer ?? 0);
    players.set(message.playerId, (players.get(message.playerId) ?? 0) + steer);
  } else if (message.type === "dispose") {
    clearInterval(timer);
    parentPort.postMessage({ type: "disposed" });
    parentPort.close();
  }
});

parentPort.postMessage({ type: "ready" });
