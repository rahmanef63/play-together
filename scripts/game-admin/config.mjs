export function buildConfig({
  id,
  title,
  description,
  minPlayers,
  maxPlayers,
  orientation,
  layout,
  controls,
  modes,
  presentation,
  version,
}) {
  return {
    schemaVersion: 1,
    protocolVersion: 1,
    game: {
      id,
      version,
      title,
      description,
      minPlayers,
      maxPlayers,
      tickRate: 30,
      snapshotRate: 15,
    },
    modes,
    presentation: { remoteDisplay: presentation },
    controller: {
      supportsRemote: modes.includes("shared-screen"),
      supportsHandheld: modes.includes("handheld"),
      preferredOrientation: orientation,
      console: buildConsole(layout, controls),
    },
    capabilities: { touch: true, keyboard: true, gamepad: false, motion: false },
  };
}

export function buildConsole(layout, tokens) {
  return { renderer: "builtin", layout, controls: tokens.map(controlFromToken) };
}

function controlFromToken(token) {
  if (token === "stick") {
    return {
      id: "move",
      kind: "stick",
      ariaLabel: "Movement stick",
      zone: "left",
      action: { type: "send", payload: { action: "move", x: "$x", y: "$y" } },
      keys: {
        up: ["ArrowUp", "KeyW"],
        down: ["ArrowDown", "KeyS"],
        left: ["ArrowLeft", "KeyA"],
        right: ["ArrowRight", "KeyD"],
      },
    };
  }
  if (token === "dpad") {
    const direction = (name, x, y, keys) => ({
      press: { type: "send", payload: { action: "move", direction: name, x, y } },
      keys,
    });
    return {
      id: "move",
      kind: "dpad",
      ariaLabel: "Movement D-pad",
      zone: "left",
      directions: {
        up: direction("up", 0, -1, ["ArrowUp", "KeyW"]),
        down: direction("down", 0, 1, ["ArrowDown", "KeyS"]),
        left: direction("left", -1, 0, ["ArrowLeft", "KeyA"]),
        right: direction("right", 1, 0, ["ArrowRight", "KeyD"]),
      },
    };
  }
  if (token === "touchpad") {
    return {
      id: "aim",
      kind: "touchpad",
      ariaLabel: "Touch control surface",
      zone: "center",
      action: { type: "send", payload: { action: "touch", x: "$x", y: "$y" } },
    };
  }
  const keyMap = {
    a: ["Space"],
    b: ["ShiftLeft"],
    x: ["KeyX"],
    y: ["KeyY"],
    l1: ["KeyQ"],
    r1: ["KeyE"],
    l2: ["KeyZ"],
    r2: ["KeyC"],
    start: ["Enter"],
    select: ["Backspace"],
  };
  return {
    id: token,
    kind: "button",
    label: token.toUpperCase(),
    ariaLabel: `${token.toUpperCase()} action`,
    face: token,
    zone: ["l1", "l2", "select"].includes(token) ? "left" : "right",
    press: { type: "send", payload: { action: token } },
    keys: keyMap[token] ?? [],
  };
}

export function buildPackage(id, version) {
  return {
    name: `@play-together/game-${id}`,
    version,
    private: true,
    type: "module",
    scripts: {
      build: `node ../../scripts/build-game.mjs games/${id}`,
      typecheck: "tsc -p tsconfig.json --noEmit",
      test: "vitest run",
    },
    dependencies: { "@play-together/game-sdk": "workspace:*" },
    devDependencies: { typescript: "5.9.3", vitest: "4.1.11" },
  };
}
