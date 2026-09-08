export async function mountGameDisplay(page, config, root, state) {
  await page.evaluate(
    async ({ config, root, state }) => {
      window.qa.dispose();
      const shell = window.qa.mountConsoleShell(document.getElementById("game-root"), {
        mode: "handheld",
        preset: config.controller.console.layout,
        title: config.game.title,
      });
      const listeners = new Set();
      let latest = { type: "snapshot", tick: 160, serverTime: 8000, state };
      const runtimeAssetManifest = await fetch(
        `/@fs/${root}/games/${config.game.id}/assets/runtime/asset-manifest.json`,
      )
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null);
      const context = {
        playerId: "qa-0",
        mode: "handheld",
        sendInput: (input) => window.qa.inputs.push(input),
        subscribe(listener) {
          listeners.add(listener);
          listener(latest);
          return () => listeners.delete(listener);
        },
        getLatestSnapshot: () => latest,
        loadAsset: async (name) => {
          const entry = runtimeAssetManifest?.assets?.[name];
          if (!entry) throw new Error(`Unexpected external QA asset: ${name}`);
          const response = await fetch(
            `/@fs/${root}/games/${config.game.id}/assets/runtime/${entry.file}`,
          );
          if (!response.ok) throw new Error(`QA asset failed: ${name}`);
          return response.blob();
        },
        setStatus: (status) => window.qa.statuses.push(String(status)),
      };
      const { mountDisplay } = await import(`/@fs/${root}/games/${config.game.id}/src/display.ts`);
      const disposeDisplay = mountDisplay(shell.screen, context);
      const disposeControls = window.qa.mountBuiltinController(
        shell.controls,
        config.controller.console,
        context,
        {
          gameTitle: config.game.title,
          gameDescription: config.game.description,
          onMenu: () => window.qa.menus++,
        },
      );
      window.qa.inputs = [];
      window.qa.statuses = [];
      window.qa.snapshot = (message) => {
        latest = message;
        for (const listener of listeners) listener(message);
      };
      window.qa.dispose = () => {
        disposeControls();
        disposeDisplay?.();
        shell.dispose();
      };
    },
    { config, root, state },
  );
}
