interface Disposable {
  dispose(): void;
}
interface SceneTree {
  traverse(visitor: (node: object) => void): void;
}
/** Release an owned scene subtree. Shared resources inside it are disposed only once.
 * Do not call this for clones whose GPU resources are owned by a different live subtree.
 */
export function disposeSceneResources(root: SceneTree): void {
  const resources = new Set<Disposable>();
  root.traverse((node) => {
    const mesh = node as { geometry?: Disposable; material?: Disposable | Disposable[] };
    if (mesh.geometry) resources.add(mesh.geometry);
    for (const material of mesh.material
      ? Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material]
      : []) {
      resources.add(material);
      for (const value of Object.values(material)) {
        if (
          value &&
          typeof value === "object" &&
          value.isTexture === true &&
          typeof value.dispose === "function"
        )
          resources.add(value);
      }
    }
  });
  for (const resource of resources) resource.dispose();
}
