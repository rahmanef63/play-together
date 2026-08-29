interface PongSnapshot {
  kind: "pong";
  phase: "waiting" | "playing";
  ball: { x: number; y: number };
  paddles: [number, number];
  score: [number, number];
  players: [string | null, string | null];
}

export function isPongSnapshot(value: unknown): value is PongSnapshot {
  if (typeof value !== "object" || value === null) return false;
  return (value as { kind?: unknown }).kind === "pong";
}

export function drawPong(canvas: HTMLCanvasElement, state: PongSnapshot | null): void {
  const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(240, Math.floor(rect.width * ratio));
  const height = Math.max(160, Math.floor(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  const logicalWidth = width / ratio;
  const logicalHeight = height / ratio;
  context.fillStyle = "#07110c";
  context.fillRect(0, 0, logicalWidth, logicalHeight);
  context.strokeStyle = "rgba(201, 255, 220, 0.25)";
  context.setLineDash([8, 9]);
  context.beginPath();
  context.moveTo(logicalWidth / 2, 0);
  context.lineTo(logicalWidth / 2, logicalHeight);
  context.stroke();
  context.setLineDash([]);

  if (!state) {
    context.fillStyle = "#c9ffdc";
    context.font = "600 16px system-ui";
    context.textAlign = "center";
    context.fillText("Connecting to room…", logicalWidth / 2, logicalHeight / 2);
    return;
  }

  const paddleHeight = logicalHeight * 0.26;
  const paddleWidth = Math.max(8, logicalWidth * 0.018);
  context.fillStyle = "#c9ffdc";
  context.fillRect(
    logicalWidth * 0.045,
    state.paddles[0] * logicalHeight - paddleHeight / 2,
    paddleWidth,
    paddleHeight,
  );
  context.fillRect(
    logicalWidth * 0.955 - paddleWidth,
    state.paddles[1] * logicalHeight - paddleHeight / 2,
    paddleWidth,
    paddleHeight,
  );
  const ballSize = Math.max(9, logicalWidth * 0.022);
  context.fillRect(
    state.ball.x * logicalWidth - ballSize / 2,
    state.ball.y * logicalHeight - ballSize / 2,
    ballSize,
    ballSize,
  );

  context.font = `700 ${Math.max(20, logicalHeight * 0.12)}px ui-monospace, monospace`;
  context.textAlign = "center";
  context.fillText(String(state.score[0]), logicalWidth * 0.42, logicalHeight * 0.16);
  context.fillText(String(state.score[1]), logicalWidth * 0.58, logicalHeight * 0.16);
  if (state.phase === "waiting") {
    context.font = "600 14px system-ui";
    context.fillText("Waiting for a controller", logicalWidth / 2, logicalHeight * 0.8);
  }
}
