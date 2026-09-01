import { fetchVerifiedManifest } from "@play-together/browser-runtime";
import type { GameManifest } from "@play-together/contracts";
import { useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../shared/convexApi";
import type { GameSummary } from "../../../shared/types";

export function useGameCatalog() {
  const gamesResult = useQuery(api.games.listLatestPublished) as GameSummary[] | undefined;
  const games = gamesResult ?? [];
  const loadingGames = gamesResult === undefined;
  const [selectedGameKey, setSelectedGameKey] = useState("");
  const [selectedManifest, setSelectedManifest] = useState<GameManifest | null>(null);
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
    if (!selectedGame) return () => void 0;
    void fetchVerifiedManifest(selectedGame.manifestUrl, selectedGame.manifestSha256)
      .then((manifest) => {
        if (current) setSelectedManifest(manifest);
      })
      .catch(() => {
        if (current) setSelectedManifest(null);
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
    setSelectedGameKey,
  };
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
