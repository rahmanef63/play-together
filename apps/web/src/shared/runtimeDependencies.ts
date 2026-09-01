import type { GameManifest } from "@play-together/contracts";
import vendorCatalog from "../../../../config/engine-vendors.json";

type VendorEntry = { url: string; sha256: string };
type VendorCatalog = { vendors: Record<string, Record<string, VendorEntry>> };
export type RuntimeImportSource = { url: string; sha256: string };

export function resolveRuntimeImports(
  manifest: GameManifest,
  origin = location.origin,
): Record<string, RuntimeImportSource> {
  const imports: Record<string, RuntimeImportSource> = {};
  const catalog = vendorCatalog as VendorCatalog;
  for (const [name, version] of Object.entries(manifest.runtimeDependencies ?? {})) {
    const entry = catalog.vendors[name]?.[version];
    if (!entry) throw new Error(`Unsupported game runtime dependency: ${name}@${version}`);
    imports[runtimeSpecifier(name, version)] = {
      url: new URL(entry.url, origin).toString(),
      sha256: entry.sha256,
    };
  }
  return imports;
}

export function runtimeSpecifier(name: string, version: string): string {
  return `@play-together/runtime/${name}@${version}`;
}
