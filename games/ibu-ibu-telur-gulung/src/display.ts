import type { DisplayGameModule } from "@play-together/game-sdk";
import { renderScene } from "./displayScene.js";
import { disposeSprite, loadSprite, type Sprite } from "./displaySprites.js";
import type { TelurState } from "./types.js";

export const mountDisplay: DisplayGameModule["mountDisplay"] = (root, ctx) => {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-label", "Ibu-Ibu Telur Gulung game display");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  root.replaceChildren(canvas);

  const g = canvas.getContext("2d", { alpha: false });
  if (!g) throw new Error("Canvas 2D is unavailable");
  g.imageSmoothingEnabled = false;

  let state: TelurState | null = null;
  let heroSprite: Sprite | undefined;
  let enemySprite: Sprite | undefined;
  let raf = 0;
  let disposed = false;

  void loadSprite(ctx, "hero.atlas", "hero.meta").then((sprite) => {
    if (disposed) disposeSprite(sprite);
    else heroSprite = sprite;
  });
  void loadSprite(ctx, "enemy.atlas", "enemy.meta").then((sprite) => {
    if (disposed) disposeSprite(sprite);
    else enemySprite = sprite;
  });

  const unsubscribe = ctx.subscribe((message) => {
    const candidate = message.state as TelurState | undefined;
    if (candidate?.kind === "ibu-ibu-telur-gulung") state = candidate;
  });

  const draw = () => {
    const width = Math.max(2, root.clientWidth);
    const height = Math.max(2, root.clientHeight);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.imageSmoothingEnabled = false;
    renderScene(g, state, heroSprite, enemySprite, width, height);
    raf = requestAnimationFrame(draw);
  };

  draw();
  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    unsubscribe();
    disposeSprite(heroSprite);
    disposeSprite(enemySprite);
    root.replaceChildren();
  };
};
