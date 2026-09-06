import { readdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, ".."),
  gamesRoot = resolve(root, "games");
let checked = 0;
for (const entry of await readdir(gamesRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const gameRoot = resolve(gamesRoot, entry.name),
    configPath = resolve(gameRoot, "asset.config.json");
  let config;
  try {
    config = JSON.parse(await readFile(configPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") continue;
    throw error;
  }
  if (config.schemaVersion !== 1 || !["2d", "3d"].includes(config.dimension))
    throw new Error(`${entry.name}: invalid asset.config.json`);
  const runtime = JSON.parse(
    await readFile(resolve(gameRoot, "assets/runtime/asset-manifest.json"), "utf8"),
  );
  if (runtime.schemaVersion !== 1 || !runtime.assets)
    throw new Error(`${entry.name}: invalid runtime asset manifest`);
  if (typeof config.generator !== "string" || !config.generator)
    throw new Error(`${entry.name}: asset generator is required`);
  await stat(resolve(gameRoot, config.generator));
  for (const asset of config.playableAssets ?? []) {
    if (config.dimension === "3d") await check3d(gameRoot, runtime, asset);
    else await check2d(gameRoot, runtime, asset);
    checked++;
  }
}
if (!checked) throw new Error("No playable assets are governed by asset.config.json");
console.log(`Game asset contract: OK (${checked} playable assets)`);
async function check3d(gameRoot, runtime, asset) {
  if (asset.kind !== "character" || asset.format !== "glb")
    throw new Error(`${asset.id}: 3D playable characters must be GLB`);
  const entry = runtime.assets[asset.runtimeAsset];
  if (entry?.contentType !== "model/gltf-binary")
    throw new Error(`${asset.id}: runtime GLB asset is not declared`);
  const bytes = await readFile(resolve(gameRoot, "assets/runtime", entry.file));
  if (bytes.length < 4096 || bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2)
    throw new Error(`${asset.id}: invalid GLB 2.0 file`);
  const json = glbJson(bytes),
    nodes = new Set((json.nodes ?? []).map((node) => node.name).filter(Boolean)),
    animations = new Set(
      (json.animations ?? []).map((animation) => animation.name).filter(Boolean),
    );
  for (const name of asset.requiredNodes ?? [])
    if (!nodes.has(name)) throw new Error(`${asset.id}: missing rig node ${name}`);
  for (const name of asset.requiredAnimations ?? [])
    if (!animations.has(name)) throw new Error(`${asset.id}: missing animation ${name}`);
  if ((json.meshes?.length ?? 0) < 8 || (json.materials?.length ?? 0) < 3)
    throw new Error(`${asset.id}: model complexity is below playable-character minimum`);
  if (bytes.length > 1_500_000) throw new Error(`${asset.id}: GLB exceeds 1.5 MB runtime budget`);
}
async function check2d(gameRoot, runtime, asset) {
  if (asset.format !== "spritesheet")
    throw new Error(`${asset.id}: 2D playable assets must use spritesheet format`);
  const sheet = runtime.assets[asset.runtimeAsset],
    meta = runtime.assets[asset.metadataAsset];
  if (!sheet || !/^image\/(png|webp)$/.test(sheet.contentType))
    throw new Error(`${asset.id}: spritesheet image is missing`);
  if (meta?.contentType !== "application/json")
    throw new Error(`${asset.id}: spritesheet metadata is missing`);
  const data = JSON.parse(await readFile(resolve(gameRoot, "assets/runtime", meta.file), "utf8"));
  if (!data.frames || !data.animations || typeof data.pivot !== "object")
    throw new Error(`${asset.id}: spritesheet metadata lacks frames/animations/pivot`);
  for (const name of asset.requiredAnimations ?? [])
    if (!data.animations[name]) throw new Error(`${asset.id}: missing 2D animation ${name}`);
}
function glbJson(bytes) {
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const length = bytes.readUInt32LE(offset),
      type = bytes.readUInt32LE(offset + 4),
      start = offset + 8;
    if (type === 0x4e4f534a)
      return JSON.parse(
        bytes
          .subarray(start, start + length)
          .toString("utf8")
          .trim(),
      );
    offset = start + length;
  }
  throw new Error("GLB JSON chunk missing");
}
