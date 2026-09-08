import { expect, it, vi } from "vitest";
import { disposeSceneResources } from "./sceneResources.js";

it("releases removed model geometry, materials and textures without double-disposing shared instances", () => {
  const geometry = { dispose: vi.fn() };
  const texture = { isTexture: true, dispose: vi.fn() };
  const material = { dispose: vi.fn(), map: texture };
  const nodes = [{}, { geometry, material }, { geometry, material: [material] }];
  disposeSceneResources({ traverse: (visit) => nodes.forEach(visit) });
  expect(geometry.dispose).toHaveBeenCalledTimes(1);
  expect(material.dispose).toHaveBeenCalledTimes(1);
  expect(texture.dispose).toHaveBeenCalledTimes(1);
});
