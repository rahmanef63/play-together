import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { buildFighter } from "./character-model.mjs";

class NodeFileReader {
  result = null;
  onloadend = null;
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    queueMicrotask(() => this.onloadend?.());
  }
  async readAsDataURL(blob) {
    const data = Buffer.from(await blob.arrayBuffer());
    this.result = `data:${blob.type || "application/octet-stream"};base64,${data.toString("base64")}`;
    queueMicrotask(() => this.onloadend?.());
  }
}
globalThis.FileReader = NodeFileReader;
const root = resolve(import.meta.dirname, "..");
const out = resolve(root, "assets/runtime");
await mkdir(out, { recursive: true });
const specs = [
  {
    id: "nova-rin",
    skin: 0xd7a078,
    hair: 0x111015,
    primary: 0xa51f33,
    dark: 0x17151d,
    accent: 0xe84c58,
    bulk: 0.92,
    armScale: 0.96,
    legScale: 1.02,
    headScale: 0.96,
    armor: false,
  },
  {
    id: "kite-vale",
    skin: 0x6f432f,
    hair: 0x0c0c10,
    primary: 0x173f82,
    dark: 0x101728,
    accent: 0xd2a84a,
    bulk: 1.2,
    armScale: 1.05,
    legScale: 1.0,
    headScale: 1.02,
    armor: true,
  },
];
const exporter = new GLTFExporter(),
  assets = {};
for (const spec of specs) {
  const { root: character, animations } = buildFighter(spec);
  const exportRoot = new (await import("three")).Group();
  exportRoot.name = spec.id;
  exportRoot.add(character);
  const buffer = await exporter.parseAsync(exportRoot, {
    binary: true,
    trs: true,
    onlyVisible: false,
    animations,
  });
  const file = `${spec.id}.glb`;
  await writeFile(resolve(out, file), Buffer.from(buffer));
  assets[`fighter.${spec.id}`] = { file, contentType: "model/gltf-binary" };
  console.log(
    `${spec.id}: ${Buffer.byteLength(Buffer.from(buffer))} bytes, ${animations.length} clips`,
  );
}
await writeFile(
  resolve(out, "asset-manifest.json"),
  `${JSON.stringify({ schemaVersion: 1, assets }, null, 2)}\n`,
);
