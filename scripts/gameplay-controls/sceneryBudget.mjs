import assert from "node:assert/strict";

/** Compare exactly the same static scene and camera before/after batching on each circuit. */
export async function verifySceneryBudget(page, root, results) {
  const budgets = await page.evaluate(async (root) => {
    const base = "/@fs/" + root + "/games/turbo-circuit/src/";
    const { createTrackScene } = await import(base + "display/track.ts");
    const { addTrackDecor } = await import(base + "display/trackDecor.ts");
    const { addTrackEnvironment } = await import(base + "display/environment.ts");
    const { batchStaticWorld } = await import(base + "display/staticWorld.ts");
    const { TRACKS } = await import(base + "shared/catalog.ts");
    const { disposeSceneResources } = await import(
      "/@fs/" + root + "/packages/game-sdk/src/sceneResources.ts"
    );
    const budgets = [];
    for (const track of TRACKS) {
      const { renderer, scene, camera } = createTrackScene(document.createElement("canvas"));
      renderer.setSize(640, 360, false);
      camera.aspect = 640 / 360;
      camera.position.set(0, 175, 110);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      addTrackDecor(scene, track);
      addTrackEnvironment(scene, track);
      renderer.render(scene, camera);
      const before = { ...renderer.info.render };
      batchStaticWorld(scene);
      renderer.render(scene, camera);
      const after = { ...renderer.info.render };
      budgets.push({
        track: track.id,
        before: before.calls,
        after: after.calls,
        trianglesBefore: before.triangles,
        trianglesAfter: after.triangles,
      });
      disposeSceneResources(scene);
      renderer.dispose();
    }
    return budgets;
  }, root);
  for (const budget of budgets) {
    assert(
      budget.after < budget.before * 0.55,
      budget.track + ": static draw calls must decrease by at least 45%",
    );
    results.push({ name: "turbo-scenery-" + budget.track, ...budget, issues: [] });
    console.log("PASS scenery budget " + JSON.stringify(budget));
  }
}
