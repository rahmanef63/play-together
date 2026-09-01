import { type GameManifest, gameManifestSchema } from "@play-together/contracts";

const verifiedBytesCache = new Map<string, Promise<ArrayBuffer>>();
const verifiedModuleCache = new Map<string, Promise<unknown>>();
const verifiedRuntimeBlobCache = new Map<string, Promise<string>>();

export interface VerifiedRuntimeImport {
  url: string;
  sha256: string;
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
export async function sha256Hex(value: ArrayBuffer): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", value));
}

function verifiedKey(url: string, sha256: string): string {
  return `${sha256.toLowerCase()}:${url}`;
}

async function fetchVerifiedBytes(url: string, expectedSha256: string): Promise<ArrayBuffer> {
  const key = verifiedKey(url, expectedSha256);
  const existing = verifiedBytesCache.get(key);
  if (existing) return existing;
  const pending = fetchAndVerify(url, expectedSha256).catch((reason) => {
    verifiedBytesCache.delete(key);
    throw reason;
  });
  verifiedBytesCache.set(key, pending);
  return pending;
}

async function fetchAndVerify(url: string, expectedSha256: string): Promise<ArrayBuffer> {
  const response = await fetch(url, { cache: "force-cache", credentials: "omit" });
  if (!response.ok) throw new Error(`Game resource request failed (${response.status})`);
  const bytes = await response.arrayBuffer();
  if ((await sha256Hex(bytes)) !== expectedSha256.toLowerCase())
    throw new Error("Game resource integrity check failed");
  return bytes;
}

export async function fetchVerifiedManifest(
  manifestUrl: string,
  expectedSha256: string,
): Promise<GameManifest> {
  try {
    const bytes = await fetchVerifiedBytes(manifestUrl, expectedSha256);
    return gameManifestSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
  } catch (reason) {
    if (reason instanceof Error && reason.message.startsWith("Game resource request failed"))
      throw new Error(reason.message.replace("Game resource", "Game manifest"));
    if (reason instanceof Error && reason.message === "Game resource integrity check failed")
      throw new Error("Game manifest integrity check failed");
    throw reason;
  }
}

export async function fetchVerifiedAsset(
  assetUrl: string,
  expectedSha256: string,
  contentType: string,
): Promise<Blob> {
  try {
    return new Blob([await fetchVerifiedBytes(assetUrl, expectedSha256)], { type: contentType });
  } catch (reason) {
    if (reason instanceof Error && reason.message.startsWith("Game resource request failed"))
      throw new Error(reason.message.replace("Game resource", "Game asset"));
    if (reason instanceof Error && reason.message === "Game resource integrity check failed")
      throw new Error("Game asset integrity check failed");
    throw reason;
  }
}

export async function importVerifiedModule<T>(
  moduleUrl: string,
  expectedSha256: string,
  runtimeImports: Readonly<Record<string, VerifiedRuntimeImport>> = {},
): Promise<T> {
  const importsKey = JSON.stringify(
    Object.entries(runtimeImports).sort(([left], [right]) => left.localeCompare(right)),
  );
  const key = `${verifiedKey(moduleUrl, expectedSha256)}:${importsKey}`;
  const existing = verifiedModuleCache.get(key);
  if (existing) return existing as Promise<T>;
  const pending = loadVerifiedModule<T>(moduleUrl, expectedSha256, runtimeImports).catch(
    (reason) => {
      verifiedModuleCache.delete(key);
      throw reason;
    },
  );
  verifiedModuleCache.set(key, pending);
  return pending;
}

async function loadVerifiedModule<T>(
  moduleUrl: string,
  expectedSha256: string,
  runtimeImports: Readonly<Record<string, VerifiedRuntimeImport>>,
): Promise<T> {
  let bytes: ArrayBuffer;
  try {
    bytes = await fetchVerifiedBytes(moduleUrl, expectedSha256);
  } catch (reason) {
    if (reason instanceof Error && reason.message.startsWith("Game resource request failed"))
      throw new Error(reason.message.replace("Game resource", "Game module"));
    if (reason instanceof Error && reason.message === "Game resource integrity check failed")
      throw new Error("Game module integrity check failed");
    throw reason;
  }
  const runtimeBlobImports = await resolveVerifiedRuntimeBlobs(runtimeImports);
  const source = rewriteRuntimeImports(new TextDecoder().decode(bytes), runtimeBlobImports);
  const blobUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
  try {
    return (await import(/* @vite-ignore */ blobUrl)) as T;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

async function resolveVerifiedRuntimeBlobs(
  runtimeImports: Readonly<Record<string, VerifiedRuntimeImport>>,
): Promise<Record<string, string>> {
  const resolved: Record<string, string> = {};
  for (const [specifier, source] of Object.entries(runtimeImports)) {
    const key = verifiedKey(source.url, source.sha256);
    let pending = verifiedRuntimeBlobCache.get(key);
    if (!pending) {
      pending = fetchVerifiedBytes(source.url, source.sha256)
        .then((bytes) => URL.createObjectURL(new Blob([bytes], { type: "text/javascript" })))
        .catch((reason) => {
          verifiedRuntimeBlobCache.delete(key);
          throw reason;
        });
      verifiedRuntimeBlobCache.set(key, pending);
    }
    resolved[specifier] = await pending;
  }
  return resolved;
}

export function rewriteRuntimeImports(
  source: string,
  runtimeImports: Readonly<Record<string, string>>,
): string {
  let rewritten = source;
  for (const [specifier, url] of Object.entries(runtimeImports)) {
    rewritten = rewritten
      .replaceAll(JSON.stringify(specifier), JSON.stringify(url))
      .replaceAll(`'${specifier.replaceAll("'", "\\'")}'`, `'${url.replaceAll("'", "\\'")}'`);
  }
  return rewritten;
}

export function resolveModuleUrl(manifestUrl: string, entryUrl: string): string {
  return new URL(entryUrl, manifestUrl).toString();
}
