export function assertSupportedRuntimeDependencies(dependencies, catalog) {
  for (const [name, version] of Object.entries(dependencies)) {
    if (!catalog?.vendors?.[name]?.[version]) {
      throw new Error(`Unsupported game runtime dependency: ${name}@${version}`);
    }
  }
}
