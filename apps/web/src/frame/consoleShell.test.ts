import type { GameManifest } from "@play-together/contracts";
import { describe, expect, it } from "vitest";
import { resolveConsoleShellPreset } from "./consoleShell";

const base = {
  schemaVersion: 1,
  protocolVersion: 1,
  game: {
    id: "demo-game",
    version: "1.0.0",
    title: "Demo Game",
    description: "A game",
    minPlayers: 1,
    maxPlayers: 4,
    tickRate: 60,
    snapshotRate: 20,
  },
  modes: ["shared-screen", "handheld"],
  controller: {
    supportsRemote: true,
    supportsHandheld: true,
    preferredOrientation: "adaptive",
  },
  entries: {
    display: { url: "./display.js", sha256: "a".repeat(64) },
    controller: { url: "./controller.js", sha256: "b".repeat(64) },
    server: { url: "./server.js", sha256: "c".repeat(64) },
  },
  capabilities: { touch: true, keyboard: true, gamepad: false, motion: false },
} satisfies GameManifest;

describe("console shell preset", () => {
  it("uses explicit cartridge metadata when present", () => {
    const manifest: GameManifest = {
      ...base,
      controller: { ...base.controller, shellPreset: "flight" },
    };
    expect(resolveConsoleShellPreset(manifest)).toBe("flight");
  });

  it("infers racing and flight shells without coupling the platform to game ids", () => {
    expect(
      resolveConsoleShellPreset({
        ...base,
        game: { ...base.game, title: "Turbo Circuit", description: "3D arcade circuit racer" },
      }),
    ).toBe("racing");
    expect(
      resolveConsoleShellPreset({
        ...base,
        game: { ...base.game, title: "Pilot Trainer", description: "Aircraft flight simulator" },
      }),
    ).toBe("flight");
  });

  it("falls back to classic for arbitrary cartridges", () => {
    expect(resolveConsoleShellPreset(base)).toBe("classic");
  });
});
