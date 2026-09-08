import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";

const runtimeDir = new URL("../assets/runtime/", import.meta.url);
await mkdir(runtimeDir, { recursive: true });

const HERO_FRAMES = ["idle", "run1", "run2", "jump", "fire", "hurt"];
const ENEMY_FRAMES = ["idle", "walk1", "walk2", "hit", "shield", "boss"];
const FRAME = 32;

function crc32(bytes) {
  let crc = ~0;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, checksum]);
}

function png(width, height, pixel) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) raw.set(pixel(x, y), row + 1 + x * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const transparent = [0, 0, 0, 0];
const inside = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1;

function heroPixel(x, y) {
  const frame = Math.floor(x / FRAME);
  const u = x % FRAME;
  const runOffset = frame === 1 ? -1 : frame === 2 ? 1 : 0;
  const jumpOffset = frame === 3 ? -3 : 0;
  const yy = y - jumpOffset;

  // sandals / legs
  if (inside(u, yy, 8 + runOffset, 25, 12 + runOffset, 29)) return [238, 130, 151, 255];
  if (inside(u, yy, 18 - runOffset, 25, 22 - runOffset, 29)) return [238, 130, 151, 255];
  if (
    inside(u, yy, 6 + runOffset, 29, 13 + runOffset, 30) ||
    inside(u, yy, 17 - runOffset, 29, 24 - runOffset, 30)
  )
    return [45, 38, 43, 255];

  // pink uniform and dark apron
  if (inside(u, yy, 7, 14, 24, 25)) return [232, 91, 146, 255];
  if (inside(u, yy, 10, 16, 22, 26)) return [48, 52, 66, 255];
  if (inside(u, yy, 6, 17, 9, 23)) return [242, 171, 133, 255];

  // hijab and face
  if (inside(u, yy, 7, 3, 23, 15)) return [236, 126, 157, 255];
  if (inside(u, yy, 10, 7, 21, 15))
    return frame === 5 ? [232, 157, 126, 255] : [247, 184, 142, 255];
  if (inside(u, yy, 21, 8, 25, 18)) return [225, 104, 148, 255];
  if (u === 18 && yy === 10) return [46, 36, 43, 255];

  // drill / telur-gulung launcher; fire frame extends the spiral
  if (inside(u, yy, 21, 17, 28, 22)) return [32, 103, 117, 255];
  if (inside(u, yy, 28, 18, 31, 21)) return [172, 181, 178, 255];
  if (frame === 4 && (inside(u, yy, 29, 15, 31, 17) || inside(u, yy, 29, 22, 31, 24)))
    return [255, 192, 52, 255];

  // hurt flash accent
  if (frame === 5 && (u + yy) % 9 === 0 && inside(u, yy, 5, 2, 26, 29)) return [255, 238, 210, 255];
  return transparent;
}

function enemyPixel(x, y) {
  const frame = Math.floor(x / FRAME);
  const u = x % FRAME;
  const walkOffset = frame === 1 ? -1 : frame === 2 ? 1 : 0;
  const shield = frame === 4;
  const boss = frame === 5;
  const hurt = frame === 3;

  if (inside(u, y, 8, 8, 24, 27))
    return hurt ? [250, 111, 82, 255] : boss ? [111, 55, 70, 255] : [198, 54, 52, 255];
  if (inside(u, y, 10, 4, 22, 13)) return boss ? [236, 157, 91, 255] : [242, 116, 58, 255];
  if (
    inside(u, y, 9 + walkOffset, 27, 13 + walkOffset, 30) ||
    inside(u, y, 19 - walkOffset, 27, 23 - walkOffset, 30)
  )
    return [48, 39, 42, 255];
  if (shield && inside(u, y, 3, 10, 9, 27)) return [73, 86, 108, 255];
  if (boss && inside(u, y, 3, 15, 8, 23)) return [44, 49, 57, 255];
  if (boss && inside(u, y, 24, 14, 31, 22)) return [44, 49, 57, 255];
  if (u === 18 && y === 8) return [42, 30, 33, 255];
  return transparent;
}

function metadata(frameNames, animations) {
  return {
    frames: Object.fromEntries(
      frameNames.map((name, index) => [
        name,
        { x: index * FRAME, y: 0, w: FRAME, h: FRAME, pivot: { x: 16, y: 28 } },
      ]),
    ),
    pivot: { x: 16, y: 28 },
    animations,
  };
}

await writeFile(new URL("hero.png", runtimeDir), png(HERO_FRAMES.length * FRAME, FRAME, heroPixel));
await writeFile(
  new URL("hero.json", runtimeDir),
  JSON.stringify(
    metadata(HERO_FRAMES, {
      idle: ["idle"],
      run: ["run1", "run2"],
      jump: ["jump"],
      fire: ["fire"],
      hurt: ["hurt"],
    }),
    null,
    2,
  ),
);
await writeFile(
  new URL("enemy.png", runtimeDir),
  png(ENEMY_FRAMES.length * FRAME, FRAME, enemyPixel),
);
await writeFile(
  new URL("enemy.json", runtimeDir),
  JSON.stringify(
    metadata(ENEMY_FRAMES, {
      idle: ["idle"],
      walk: ["walk1", "walk2"],
      hit: ["hit"],
    }),
    null,
    2,
  ),
);

async function sha256(file) {
  return createHash("sha256")
    .update(await readFile(new URL(file, runtimeDir)))
    .digest("hex");
}

const assets = {};
for (const [key, file, contentType] of [
  ["hero.atlas", "hero.png", "image/png"],
  ["hero.meta", "hero.json", "application/json"],
  ["enemy.atlas", "enemy.png", "image/png"],
  ["enemy.meta", "enemy.json", "application/json"],
]) {
  assets[key] = { file, contentType, sha256: await sha256(file) };
}
await writeFile(
  new URL("asset-manifest.json", runtimeDir),
  `${JSON.stringify({ schemaVersion: 1, assets }, null, 2)}\n`,
);
