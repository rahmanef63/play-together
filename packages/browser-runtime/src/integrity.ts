import { type GameManifest, gameManifestSchema } from "@play-together/contracts";

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
export async function sha256Hex(value: ArrayBuffer): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", value));
}

async function fetchVerifiedBytes(
  url: string,
  expectedSha256: string,
  cache: RequestCache,
): Promise<ArrayBuffer> {
  const response = await fetch(url, { cache, credentials: "omit" });
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
    const bytes = await fetchVerifiedBytes(manifestUrl, expectedSha256, "no-store");
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
    return new Blob([await fetchVerifiedBytes(assetUrl, expectedSha256, "force-cache")], {
      type: contentType,
    });
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
): Promise<T> {
  let bytes: ArrayBuffer;
  try {
    bytes = await fetchVerifiedBytes(moduleUrl, expectedSha256, "no-store");
  } catch (reason) {
    if (reason instanceof Error && reason.message.startsWith("Game resource request failed"))
      throw new Error(reason.message.replace("Game resource", "Game module"));
    if (reason instanceof Error && reason.message === "Game resource integrity check failed")
      throw new Error("Game module integrity check failed");
    throw reason;
  }
  const blobUrl = URL.createObjectURL(new Blob([bytes], { type: "text/javascript" }));
  try {
    return (await import(/* @vite-ignore */ blobUrl)) as T;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

export function resolveModuleUrl(manifestUrl: string, entryUrl: string): string {
  return new URL(entryUrl, manifestUrl).toString();
}
