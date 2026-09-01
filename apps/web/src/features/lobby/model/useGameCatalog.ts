import {
  fetchVerifiedManifest,
  prefetchVerifiedResource,
  resolveModuleUrl,
} from "@play-together/browser-runtime";
import type { GameManifest } from "@play-together/contracts";
import { useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../shared/convexApi";
import { resolveRuntimeImports } from "../../../shared/runtimeDependencies";
import type { GameSummary } from "../../../shared/types";

export function useGameCatalog() {
  const gamesResult = useQuery(api.games.listLatestPublished) as GameSummary[] | undefined;
  const games = gamesResult ?? [];
  const loadingGames = gamesResult === undefined;
  const [selectedGameKey, setSelectedGameKey] = useState("");
  const [selectedManifest, setSelectedManifest] = useState<GameManifest | null>(null);
  const [selectedManifestError, setSelectedManifestError] = useState("");
  const defaultGame = games[0];
  const gameById = useMemo(
    () => new Map(games.map((game) => [`${game.gameId}@${game.version}`, game])),
    [games],
  );
  const effectiveGameKey =
    selectedGameKey || (defaultGame ? `${defaultGame.gameId}@${defaultGame.version}` : "");
  const selectedGame = gameById.get(effectiveGameKey) ?? defaultGame;

  useEffect(() => {
    let current = true;
    setSelectedManifest(null);
    setSelectedManifestError("");
    if (!selectedGame) return () => void 0;
    void fetchVerifiedManifest(selectedGame.manifestUrl, selectedGame.manifestSha256)
      .then((manifest) => {
        const runtimeImports = resolveRuntimeImports(manifest);
        if (!current) return;
        setSelectedManifest(manifest);
        void warmSelectedRuntime(manifest, selectedGame.manifestUrl, runtimeImports);
      })
      .catch((reason) => {
        if (!current) return;
        setSelectedManifest(null);
        setSelectedManifestError(
          reason instanceof Error ? reason.message : "Selected game runtime is unavailable",
        );
      });
    return () => {
      current = false;
    };
  }, [selectedGame]);

  return {
    effectiveGameKey,
    gameById,
    games,
    loadingGames,
    selectedGame,
    selectedGameKey,
    selectedManifest,
    selectedManifestError,
    setSelectedGameKey,
  };
}

async function warmSelectedRuntime(
  manifest: GameManifest,
  manifestUrl: string,
  runtimeImports: ReturnType<typeof resolveRuntimeImports>,
) {
  const entries = [manifest.entries.display, manifest.entries.controller].filter(
    (entry): entry is { url: string; sha256: string } => Boolean(entry),
  );
  await Promise.allSettled([
    ...entries.map((entry) =>
      prefetchVerifiedResource(resolveModuleUrl(manifestUrl, entry.url), entry.sha256),
    ),
    ...Object.values(runtimeImports).map((entry) =>
      prefetchVerifiedResource(entry.url, entry.sha256),
    ),
  ]);
}

export function consoleLayoutLabel(manifest: GameManifest): string {
  const layout = manifest.controller.console?.layout ?? "gamepad";
  return layout === "touch"
    ? "Touch surface"
    : `${layout[0]?.toUpperCase() ?? "G"}${layout.slice(1)}`;
}

export function consoleControlLabels(manifest: GameManifest): string[] {
  return (manifest.controller.console?.controls ?? []).map((control) => {
    if (control.kind === "stick") return "Analog stick";
    if (control.kind === "dpad") return "D-pad";
    if (control.kind === "touchpad") return "Touchpad";
    return control.displayLabel ?? control.label;
  });
}
