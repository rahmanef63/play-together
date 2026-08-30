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
  it("uses explicit legacy cartridge metadata when present", () => {
    const manifest: GameManifest = {
      ...base,
      controller: { ...base.controller, shellPreset: "flight" },
    };
    expect(resolveConsoleShellPreset(manifest)).toBe("flight");
  });

  it("derives racing and flight shells from declarative console layout", () => {
    const control = {
      id: "action",
      kind: "button" as const,
      label: "A",
      ariaLabel: "Action",
      face: "a" as const,
      zone: "right" as const,
      press: { type: "send" as const, payload: { action: "go" } },
    };
    expect(
      resolveConsoleShellPreset({
        ...base,
        controller: {
          ...base.controller,
          console: { renderer: "builtin", layout: "racing", controls: [control] },
        },
      }),
    ).toBe("racing");
    expect(
      resolveConsoleShellPreset({
        ...base,
        controller: {
          ...base.controller,
          console: { renderer: "builtin", layout: "flight", controls: [control] },
        },
      }),
    ).toBe("flight");
  });

  it("does not infer hardware from game names and falls back to classic", () => {
    expect(
      resolveConsoleShellPreset({
        ...base,
        game: { ...base.game, title: "Turbo Fighter Flight Racing Simulator" },
      }),
    ).toBe("classic");
  });
});
