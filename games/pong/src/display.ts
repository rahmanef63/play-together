import type { BrowserGameContext, DisplayGameModule } from "@play-together/game-sdk";
import { drawPong, isPongSnapshot } from "./render.js";

export const mountDisplay: DisplayGameModule["mountDisplay"] = (
  root: HTMLElement,
  context: BrowserGameContext,
) => {
  root.replaceChildren();
  const frame = document.createElement("section");
  frame.className = "pong-display";
  frame.style.cssText =
    "width:100%;height:100%;min-height:280px;display:grid;place-items:stretch;background:#07110c;border-radius:24px;overflow:hidden";
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-label", "Pong shared display");
  canvas.style.cssText = "display:block;width:100%;height:100%;min-height:280px";
  frame.append(canvas);
  root.append(frame);

  let latest: Parameters<typeof drawPong>[1] = null;
  const unsubscribe = context.subscribe((message) => {
    if (isPongSnapshot(message.state)) latest = message.state;
  });
  let animationFrame = 0;
  const render = () => {
    drawPong(canvas, latest);
    animationFrame = requestAnimationFrame(render);
  };
  render();

  return () => {
    unsubscribe();
    cancelAnimationFrame(animationFrame);
    root.replaceChildren();
  };
};
