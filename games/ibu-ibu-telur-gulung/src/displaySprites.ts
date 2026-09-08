import type { DisplayGameModule } from "@play-together/game-sdk";

export type SpriteFrame = {
  x: number;
  y: number;
  w: number;
  h: number;
  pivot: { x: number; y: number };
};
export type AtlasMeta = {
  frames: Record<string, SpriteFrame>;
  animations: Record<string, string[]>;
  pivot: { x: number; y: number };
};
export type Sprite = { image: HTMLImageElement; meta: AtlasMeta; url: string };

type DisplayContext = Parameters<DisplayGameModule["mountDisplay"]>[1];

async function loadMetadata(ctx: DisplayContext, name: string): Promise<AtlasMeta> {
  const blob = await ctx.loadAsset(name);
  return JSON.parse(await blob.text()) as AtlasMeta;
}

export async function loadSprite(
  ctx: DisplayContext,
  imageName: string,
  metadataName: string,
): Promise<Sprite> {
  const [blob, meta] = await Promise.all([
    ctx.loadAsset(imageName),
    loadMetadata(ctx, metadataName),
  ]);
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.src = url;
  await image.decode().catch(() => undefined);
  return { image, meta, url };
}

export function disposeSprite(sprite: Sprite | undefined): void {
  if (sprite) URL.revokeObjectURL(sprite.url);
}

export function drawSprite(
  g: CanvasRenderingContext2D,
  sprite: Sprite | undefined,
  animation: string,
  elapsedMs: number,
  x: number,
  y: number,
  width: number,
  height: number,
  forcedFrame?: string,
): boolean {
  if (!sprite?.image.complete) return false;
  const frameName = forcedFrame ?? animationFrame(sprite.meta, animation, elapsedMs);
  const frame = sprite.meta.frames[frameName];
  if (!frame) return false;
  g.drawImage(sprite.image, frame.x, frame.y, frame.w, frame.h, x, y, width, height);
  return true;
}

function animationFrame(meta: AtlasMeta, animation: string, elapsedMs: number): string {
  const frames = meta.animations[animation] ?? meta.animations.idle ?? Object.keys(meta.frames);
  if (!frames.length) return Object.keys(meta.frames)[0] ?? "";
  return frames[Math.floor(elapsedMs / 120) % frames.length] ?? frames[0] ?? "";
}
