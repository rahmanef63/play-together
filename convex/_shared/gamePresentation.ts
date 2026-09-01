export type RemoteDisplayMode = "shared" | "per-player";
export interface RemoteDisplayPolicy {
  mode: RemoteDisplayMode;
  maxViewports: number;
}

export function normalizeRemoteDisplay(
  mode: RemoteDisplayMode | undefined,
  maxViewports: number | undefined,
): RemoteDisplayPolicy {
  if (mode !== "per-player") return { mode: "shared", maxViewports: 1 };
  const viewports = Number.isInteger(maxViewports) ? Number(maxViewports) : 1;
  return { mode, maxViewports: Math.max(1, Math.min(4, viewports)) };
}
