/** Mount the actual source display with authoritative server snapshots and its runtime assets. */
export async function mountPreview(page, game, scenario) {
  await page.evaluate(
    async ({ root, id, snapshot, hide }) => {
      const manifest = await fetch(`/@fs/${root}/assets/runtime/asset-manifest.json`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      let latest = snapshot;
      const listeners = new Set();
      const ctx = {
        playerId: "preview-0",
        mode: "handheld",
        sendInput() {},
        subscribe(fn) {
          listeners.add(fn);
          fn(latest);
          return () => listeners.delete(fn);
        },
        getLatestSnapshot: () => latest,
        async loadAsset(name) {
          const entry = manifest?.assets?.[name];
          if (!entry) throw new Error(`Missing preview asset ${name}`);
          const response = await fetch(`/@fs/${root}/assets/runtime/${entry.file}`);
          if (!response.ok) throw new Error(`Asset load failed: ${name}`);
          return response.blob();
        },
        setStatus(message) {
          window.previewStatus = message;
        },
      };
      const module = await import(`/@fs/${root}/src/display.ts`);
      window.disposePreview = module.mountDisplay(document.querySelector("#game-root"), ctx);
      window.previewSnapshot = (message) => {
        latest = message;
        for (const fn of listeners) fn(message);
      };
      const style = document.createElement("style");
      style.textContent = hide.map((selector) => `${selector}{visibility:hidden}`).join("\n");
      document.head.append(style);
    },
    { root: game.root, id: game.id, snapshot: scenario.snapshot, hide: scenario.spec.hide ?? [] },
  );
  if (scenario.spec.readySelector)
    await page.locator(scenario.spec.readySelector).waitFor({ state: "attached", timeout: 15000 });
  await page.waitForFunction(() => {
    const canvas = document.querySelector("canvas");
    return canvas?.width > 32 && canvas?.height > 32;
  });
  await page.waitForTimeout(500);
}
