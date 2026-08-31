import { useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../shared/convexApi";
import type { GameRegistryDocument, GameRegistryEntry, GameSummary } from "../../../shared/types";

export function useGameCatalog() {
  const gamesResult = useQuery(api.games.listLatestPublished) as GameSummary[] | undefined;
  const games = gamesResult ?? [];
  const loadingGames = gamesResult === undefined;
  const [selectedGameKey, setSelectedGameKey] = useState("");
  const [registry, setRegistry] = useState<GameRegistryDocument | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/game-registry.json", { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Game registry request failed (${response.status})`);
        return response.json() as Promise<GameRegistryDocument>;
      })
      .then(setRegistry)
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) setRegistry(null);
      });
    return () => controller.abort();
  }, []);

  const defaultGame = games[0];
  const gameById = useMemo(
    () => new Map(games.map((game) => [`${game.gameId}@${game.version}`, game])),
    [games],
  );
  const effectiveGameKey =
    selectedGameKey || (defaultGame ? `${defaultGame.gameId}@${defaultGame.version}` : "");
  const selectedGame = gameById.get(effectiveGameKey) ?? defaultGame;
  const selectedRegistry = registry?.games.find(
    (entry) => `${entry.id}@${entry.version}` === effectiveGameKey,
  );

  return {
    effectiveGameKey,
    gameById,
    games,
    loadingGames,
    selectedGame,
    selectedGameKey,
    selectedRegistry,
    setSelectedGameKey,
  };
}

export function consoleLayoutLabel(entry: GameRegistryEntry): string {
  const layout = entry.controller.console?.layout ?? "gamepad";
  if (layout === "racing") return "Racing";
  if (layout === "flight") return "Flight";
  if (layout === "touch") return "Touch surface";
  if (layout === "arcade") return "Arcade";
  return "Gamepad";
}

export function consoleControlLabels(entry: GameRegistryEntry): string[] {
  return (entry.controller.console?.controls ?? []).map((control) => {
    if (control.kind === "stick") return "Analog stick";
    if (control.kind === "dpad") return "D-pad";
    if (control.kind === "touchpad") return "Touchpad";
    return control.label;
  });
}
