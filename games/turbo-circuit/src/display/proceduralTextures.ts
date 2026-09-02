import * as THREE from "three";

export function createRoadMaterial(color: number) {
  const textures = surfaceTextures(color, 256, true);
  textures.map.repeat.set(1, 42);
  textures.normalMap.repeat.set(1, 42);
  textures.roughnessMap.repeat.set(1, 42);
  const material = new THREE.MeshStandardMaterial({
    map: textures.map,
    normalMap: textures.normalMap,
    roughnessMap: textures.roughnessMap,
    roughness: 0.84,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  material.normalScale.set(1.55, 1.55);
  return material;
}
export function createGroundMaterial(color: number) {
  const textures = surfaceTextures(color, 128, false);
  for (const texture of [textures.map, textures.normalMap, textures.roughnessMap])
    texture.repeat.set(24, 24);
  const material = new THREE.MeshStandardMaterial({
    map: textures.map,
    normalMap: textures.normalMap,
    roughnessMap: textures.roughnessMap,
    roughness: 0.92,
  });
  material.normalScale.set(1.25, 1.25);
  return material;
}
export function canvasTexture(canvas: HTMLCanvasElement, srgb = true) {
  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
export function disposeMaterialTextures(
  material: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial,
) {
  const standard = material as THREE.MeshStandardMaterial;
  standard.map?.dispose();
  standard.normalMap?.dispose();
  standard.roughnessMap?.dispose();
}
function surfaceTextures(base: number, size: number, road: boolean) {
  const heights = new Float32Array(size * size),
    baseRgb = rgb(base);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const coarse = fbm(x / size, y / size, road ? 38 : 14),
        fine = hash(x, y);
      heights[y * size + x] = coarse * (road ? 0.55 : 0.72) + fine * (road ? 0.2 : 0.3);
    }
  const color = document.createElement("canvas"),
    normal = document.createElement("canvas"),
    rough = document.createElement("canvas");
  for (const canvas of [color, normal, rough]) canvas.width = canvas.height = size;
  const cctx = required(color),
    nctx = required(normal),
    rctx = required(rough),
    colorImage = cctx.createImageData(size, size),
    normalImage = nctx.createImageData(size, size),
    roughImage = rctx.createImageData(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const index = y * size + x,
        px = index * 4,
        variation = (hash(x * 7, y * 11) - 0.5) * (road ? 30 : 42),
        left = heights[y * size + ((x - 1 + size) % size)] ?? 0,
        right = heights[y * size + ((x + 1) % size)] ?? 0,
        down = heights[((y - 1 + size) % size) * size + x] ?? 0,
        up = heights[((y + 1) % size) * size + x] ?? 0,
        strength = road ? 3.1 : 2.2,
        dx = (right - left) * strength,
        dy = (up - down) * strength,
        length = Math.hypot(dx, dy, 1);
      setPixel(
        colorImage.data,
        px,
        baseRgb.r + variation,
        baseRgb.g + variation,
        baseRgb.b + variation,
      );
      setPixel(
        normalImage.data,
        px,
        (-dx / length) * 127.5 + 127.5,
        (-dy / length) * 127.5 + 127.5,
        (1 / length) * 127.5 + 127.5,
      );
      const roughness = road ? 204 + hash(x, y) * 30 : 225 + hash(x, y) * 22;
      setPixel(roughImage.data, px, roughness, roughness, roughness);
    }
  cctx.putImageData(colorImage, 0, 0);
  nctx.putImageData(normalImage, 0, 0);
  rctx.putImageData(roughImage, 0, 0);
  if (road) paintRoadDetails(cctx, size);
  const map = repeating(canvasTexture(color)),
    normalMap = repeating(canvasTexture(normal, false)),
    roughnessMap = repeating(canvasTexture(rough, false));
  return { map, normalMap, roughnessMap };
}
function paintRoadDetails(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = "rgba(0,0,0,.2)";
  ctx.fillRect(size * 0.27, 0, size * 0.07, size);
  ctx.fillRect(size * 0.66, 0, size * 0.07, size);
  ctx.strokeStyle = "#d5a928";
  ctx.lineWidth = Math.max(3, size * 0.018);
  ctx.setLineDash([size * 0.09, size * 0.09]);
  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size / 2, size);
  ctx.stroke();
}
function repeating(texture: THREE.Texture) {
  texture.wrapS = 1000;
  texture.wrapT = 1000;
  return texture;
}
function fbm(x: number, y: number, scale: number) {
  let value = 0,
    amplitude = 0.5,
    frequency = scale;
  for (let octave = 0; octave < 3; octave++) {
    value += amplitude * noise(x * frequency, y * frequency);
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value;
}
function noise(x: number, y: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    fx = x - ix,
    fy = y - iy,
    u = fx * fx * (3 - 2 * fx),
    v = fy * fy * (3 - 2 * fy),
    a = hash(ix, iy),
    b = hash(ix + 1, iy),
    c = hash(ix, iy + 1),
    d = hash(ix + 1, iy + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
function hash(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}
function rgb(value: number) {
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}
function setPixel(data: Uint8ClampedArray, offset: number, r: number, g: number, b: number) {
  data[offset] = clampByte(r);
  data[offset + 1] = clampByte(g);
  data[offset + 2] = clampByte(b);
  data[offset + 3] = 255;
}
function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}
function required(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  return ctx;
}
