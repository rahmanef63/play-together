import { spawnSync } from "node:child_process";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { discoverGames } from "./discover-games.mjs";

const ROOT = process.cwd();
const GAME_ID = /^[a-z0-9][a-z0-9-]{1,63}$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?$/;
const CONTROL_TOKENS = new Set([
  "stick",
  "dpad",
  "touchpad",
  "a",
  "b",
  "x",
  "y",
  "l1",
  "r1",
  "l2",
  "r2",
  "start",
  "select",
]);
const LAYOUTS = new Set(["gamepad", "arcade", "racing", "flight", "touch"]);
const ORIENTATIONS = new Set(["portrait", "landscape", "adaptive"]);
const MODES = new Set(["shared-screen", "handheld"]);

export async function runGameTool(action, input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Tool input must be a JSON object");
  if (action === "list") return listGames();
  if (action === "get") return getGame(requireId(input.id));
  if (action === "create") return createGame(input);
  if (action === "update") return updateGame(input);
  if (action === "delete") return deleteGame(requireId(input.id));
  if (action === "validate") return validateGame(requireId(input.id));
  if (action === "publish") return publishGame(requireId(input.id));
  if (action === "registry") return refreshRegistry();
  if (action === "prompt") return { prompt: await readSubmissionPrompt() };
  throw new Error(`Unknown game tool action: ${String(action)}`);
}

async function listGames() {
  const games = await discoverGames(ROOT);
  const catalog = await readCatalog();
  return {
    count: games.length,
    games: games.map(({ id, config }) => {
      const releases = catalog.games
        .filter((entry) => entry.gameId === id)
        .map((entry) => entry.version);
      return {
        id,
        title: config.game.title,
        version: config.game.version,
        minPlayers: config.game.minPlayers,
        maxPlayers: config.game.maxPlayers,
        layout: config.controller?.console?.layout ?? "custom",
        controls: (config.controller?.console?.controls ?? []).map((control) => control.id),
        published: releases.includes(config.game.version),
        releaseCount: releases.length,
      };
    }),
  };
}

async function getGame(id) {
  const root = gameRoot(id);
  const [config, packageJson, catalog] = await Promise.all([
    readJson(resolve(root, "game.config.json")),
    readJson(resolve(root, "package.json")),
    readCatalog(),
  ]);
  const releases = catalog.games.filter((entry) => entry.gameId === id);
  return {
    id,
    root: `games/${id}`,
    config,
    package: { name: packageJson.name, version: packageJson.version },
    releases,
    currentVersionPublished: releases.some((entry) => entry.version === config.game.version),
  };
}

async function createGame(input) {
  const id = requireId(input.id);
  const root = gameRoot(id);
  if (await exists(root)) throw new Error(`Game ${id} already exists`);
  const title = requireText(input.title, "title", 2, 80);
  const description = requireText(input.description, "description", 8, 240);
  const minPlayers = requireInteger(input.minPlayers, "minPlayers", 1, 32);
  const maxPlayers = requireInteger(input.maxPlayers, "maxPlayers", minPlayers, 32);
  const orientation = requireEnum(input.orientation ?? "adaptive", ORIENTATIONS, "orientation");
  const layout = requireEnum(input.layout ?? "gamepad", LAYOUTS, "layout");
  const controls = normalizeControlTokens(input.controls ?? ["a"]);
  const modes = normalizeModes(input.modes ?? ["shared-screen", "handheld"]);
  const version = "0.1.0";
  const config = buildConfig({
    id,
    title,
    description,
    minPlayers,
    maxPlayers,
    orientation,
    layout,
    controls,
    modes,
    version,
  });
  const packageJson = buildPackage(id, version);
  const serverSource = optionalSource(input.serverSource) ?? starterServer(id);
  const displaySource = optionalSource(input.displaySource) ?? starterDisplay(id, title);
  const testSource = optionalSource(input.testSource) ?? starterTest(id);

  await mkdir(resolve(root, "src"), { recursive: true });
  await Promise.all([
    writeJson(resolve(root, "game.config.json"), config),
    writeJson(resolve(root, "package.json"), packageJson),
    writeJson(resolve(root, "tsconfig.json"), {
      extends: "../../tsconfig.base.json",
      compilerOptions: { types: ["vitest/globals"] },
      include: ["src/**/*.ts"],
    }),
    writeFile(resolve(root, "src/server.ts"), ensureTrailingNewline(serverSource)),
    writeFile(resolve(root, "src/display.ts"), ensureTrailingNewline(displaySource)),
    writeFile(resolve(root, "src/server.test.ts"), ensureTrailingNewline(testSource)),
  ]);
  await refreshWorkspaceLinks();
  await runCommand("node", ["scripts/generate-game-registry.mjs"]);
  return {
    created: true,
    game: await getGame(id),
    note: "Draft scaffold created. Implement real mechanics and validate before publishing.",
  };
}

async function updateGame(input) {
  const id = requireId(input.id);
  const root = gameRoot(id);
  const configPath = resolve(root, "game.config.json");
  const packagePath = resolve(root, "package.json");
  const config = await readJson(configPath);
  const packageJson = await readJson(packagePath);
  const expectedVersion = requireText(input.expectedVersion, "expectedVersion", 5, 40);
  if (config.game.version !== expectedVersion) {
    throw new Error(
      `Version mismatch: expected ${expectedVersion}, current ${config.game.version}`,
    );
  }
  const catalog = await readCatalog();
  const currentPublished = catalog.games.some(
    (entry) => entry.gameId === id && entry.version === config.game.version,
  );
  const requestedNewVersion =
    input.newVersion === undefined ? undefined : requireSemver(input.newVersion, "newVersion");
  if (currentPublished && !requestedNewVersion) {
    throw new Error(
      "Current version is published and immutable. Provide a greater newVersion before changing bytes.",
    );
  }
  if (requestedNewVersion && compareSemver(requestedNewVersion, config.game.version) <= 0) {
    throw new Error(`newVersion must be greater than ${config.game.version}`);
  }

  const next = structuredClone(config);
  if (input.title !== undefined) next.game.title = requireText(input.title, "title", 2, 80);
  if (input.description !== undefined)
    next.game.description = requireText(input.description, "description", 8, 240);
  if (input.minPlayers !== undefined)
    next.game.minPlayers = requireInteger(input.minPlayers, "minPlayers", 1, 32);
  if (input.maxPlayers !== undefined)
    next.game.maxPlayers = requireInteger(input.maxPlayers, "maxPlayers", next.game.minPlayers, 32);
  if (next.game.maxPlayers < next.game.minPlayers)
    throw new Error("maxPlayers must be >= minPlayers");
  if (input.orientation !== undefined)
    next.controller.preferredOrientation = requireEnum(
      input.orientation,
      ORIENTATIONS,
      "orientation",
    );
  if (input.layout !== undefined) {
    next.controller.console.layout = requireEnum(input.layout, LAYOUTS, "layout");
  }
  if (input.controls !== undefined) {
    const layout = requireEnum(next.controller.console?.layout ?? "gamepad", LAYOUTS, "layout");
    next.controller.console = buildConsole(layout, normalizeControlTokens(input.controls));
  }
  if (input.modes !== undefined) next.modes = normalizeModes(input.modes);
  const nextVersion = requestedNewVersion ?? config.game.version;
  next.game.version = nextVersion;
  packageJson.version = nextVersion;

  await writeJson(configPath, next);
  await writeJson(packagePath, packageJson);
  if (input.serverSource !== undefined)
    await writeFile(
      resolve(root, "src/server.ts"),
      ensureTrailingNewline(requireSource(input.serverSource, "serverSource")),
    );
  if (input.displaySource !== undefined)
    await writeFile(
      resolve(root, "src/display.ts"),
      ensureTrailingNewline(requireSource(input.displaySource, "displaySource")),
    );
  if (input.testSource !== undefined)
    await writeFile(
      resolve(root, "src/server.test.ts"),
      ensureTrailingNewline(requireSource(input.testSource, "testSource")),
    );
  await runCommand("node", ["scripts/generate-game-registry.mjs"]);
  return { updated: true, previousVersion: expectedVersion, game: await getGame(id) };
}

async function deleteGame(id) {
  const root = gameRoot(id);
  if (!(await exists(root))) throw new Error(`Game ${id} does not exist`);
  const catalog = await readCatalog();
  if (catalog.games.some((entry) => entry.gameId === id)) {
    throw new Error(
      "Published games cannot be deleted. Historical releases and pinned rooms are immutable.",
    );
  }
  await rm(root, { recursive: true, force: false });
  await refreshWorkspaceLinks();
  await runCommand("node", ["scripts/generate-game-registry.mjs"]);
  return { deleted: true, id };
}

async function validateGame(id) {
  await getGame(id);
  const packageName = `@play-together/game-${id}`;
  const results = [];
  results.push({
    step: "discover",
    output: await runCommand("node", ["scripts/discover-games.mjs"]),
  });
  results.push({
    step: "typecheck",
    output: await runCommand("pnpm", ["--filter", packageName, "typecheck"]),
  });
  results.push({
    step: "test",
    output: await runCommand("pnpm", ["--filter", packageName, "test"]),
  });
  results.push({
    step: "build",
    output: await runCommand("pnpm", ["--filter", packageName, "build"]),
  });
  return { ok: true, id, results: results.map(({ step }) => step) };
}

async function publishGame(id) {
  await validateGame(id);
  const output = await runCommand("node", ["scripts/publish-game.mjs", id]);
  await runCommand("node", ["scripts/generate-game-registry.mjs"]);
  const catalog = await readCatalog();
  const config = await readJson(resolve(gameRoot(id), "game.config.json"));
  const release = catalog.games.find(
    (entry) => entry.gameId === id && entry.version === config.game.version,
  );
  if (!release) throw new Error("Publish completed without a catalog entry");
  return {
    published: true,
    release,
    note: "Local immutable release created. Production registration is intentionally performed only by verified main-branch CI.",
    output: output.split("\n").at(-1) ?? "",
  };
}

async function refreshRegistry() {
  await runCommand("node", ["scripts/generate-game-registry.mjs"]);
  const registry = await readJson(resolve(ROOT, "apps/web/public/game-registry.json"));
  return { generated: true, schemaVersion: registry.schemaVersion, count: registry.games.length };
}

function buildConfig({
  id,
  title,
  description,
  minPlayers,
  maxPlayers,
  orientation,
  layout,
  controls,
  modes,
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
    controller: {
      supportsRemote: modes.includes("shared-screen"),
      supportsHandheld: modes.includes("handheld"),
      preferredOrientation: orientation,
      console: buildConsole(layout, controls),
    },
    capabilities: { touch: true, keyboard: true, gamepad: false, motion: false },
  };
}

function buildConsole(layout, tokens) {
  const controls = tokens.map((token) => controlFromToken(token));
  return { renderer: "builtin", layout, controls };
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

function buildPackage(id, version) {
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

function starterServer(id) {
  return `import type { CreateServerGame, ServerGame, ServerGameContext, ServerPlayer } from "@play-together/game-sdk";\n\ninterface PlayerState { id: string; score: number; lastAction: string | null }\ninterface State { kind: "${id}"; ticks: number; players: PlayerState[] }\n\nclass StarterGame implements ServerGame {\n  readonly #state: State = { kind: "${id}", ticks: 0, players: [] };\n  readonly #lastSeq = new Map<string, number>();\n  constructor(_context: ServerGameContext) {}\n  onJoin(player: ServerPlayer) {\n    if (!this.#state.players.some((item) => item.id === player.id)) this.#state.players.push({ id: player.id, score: 0, lastAction: null });\n  }\n  onLeave(playerId: string) {\n    this.#state.players = this.#state.players.filter((item) => item.id !== playerId);\n    this.#lastSeq.delete(playerId);\n  }\n  onInput(playerId: string, payload: unknown, sequence: number) {\n    const previous = this.#lastSeq.get(playerId) ?? -1;\n    if (sequence <= previous || typeof payload !== "object" || payload === null) return;\n    const action = (payload as { action?: unknown }).action;\n    if (typeof action !== "string") return;\n    const player = this.#state.players.find((item) => item.id === playerId);\n    if (!player) return;\n    this.#lastSeq.set(playerId, sequence);\n    player.lastAction = action;\n    player.score += 1;\n  }\n  tick(_nowMs: number, _deltaMs: number) { this.#state.ticks += 1; }\n  snapshot() { return structuredClone(this.#state); }\n}\n\nexport const createServerGame: CreateServerGame = (context) => new StarterGame(context);\n`;
}

function starterDisplay(id, title) {
  return `import type { DisplayGameModule } from "@play-together/game-sdk";\n\ninterface State { kind: "${id}"; ticks: number; players: Array<{ id: string; score: number; lastAction: string | null }> }\nconst isState = (value: unknown): value is State => typeof value === "object" && value !== null && (value as { kind?: unknown }).kind === "${id}";\n\nexport const mountDisplay: DisplayGameModule["mountDisplay"] = (root, context) => {\n  root.replaceChildren();\n  const surface = document.createElement("section");\n  surface.style.cssText = "width:100%;height:100%;display:grid;place-content:center;gap:18px;padding:clamp(20px,5vw,56px);background:#11131a;color:#fff;font-family:system-ui;text-align:center";\n  const heading = document.createElement("h1");\n  heading.textContent = ${JSON.stringify(title)};\n  heading.style.cssText = "margin:0;font-size:clamp(34px,8vw,88px);letter-spacing:-.05em";\n  const status = document.createElement("p");\n  status.style.cssText = "margin:0;color:#aab2c0";\n  surface.append(heading, status);\n  root.append(surface);\n  const unsubscribe = context.subscribe((message) => {\n    if (!isState(message.state)) return;\n    const score = message.state.players.map((player, index) => \`P\${index + 1}: \${player.score}\`).join(" · ");\n    status.textContent = score || "Waiting for players";\n  });\n  return () => { unsubscribe(); root.replaceChildren(); };\n};\n`;
}

function starterTest(id) {
  return `import { describe, expect, it } from "vitest";\nimport { createServerGame } from "./server.js";\n\ndescribe(${JSON.stringify(id)}, () => {\n  it("accepts a joined player input through the authoritative server", async () => {\n    const game = await createServerGame({ roomId: "room", gameId: ${JSON.stringify(id)}, gameVersion: "0.1.0", seed: 1 });\n    await game.onJoin({ id: "p1", connectedAt: 0 });\n    await game.onInput("p1", { action: "a" }, 1);\n    const state = game.snapshot() as { players: Array<{ score: number }> };\n    expect(state.players[0]?.score).toBe(1);\n  });\n});\n`;
}

async function refreshWorkspaceLinks() {
  await runCommand("pnpm", ["install", "--prefer-offline", "--ignore-scripts"]);
}

async function readSubmissionPrompt() {
  const markdown = await readFile(resolve(ROOT, "docs/submitting-games.md"), "utf8");
  const headingIndex = markdown.indexOf("## Base prompt for an AI coding agent");
  const fenceStart = markdown.indexOf("```text", headingIndex);
  const fenceEnd = markdown.indexOf("\n```", fenceStart + 7);
  if (headingIndex < 0 || fenceStart < 0 || fenceEnd < 0)
    throw new Error("Submission prompt block is missing from docs/submitting-games.md");
  return markdown.slice(fenceStart + 7, fenceEnd).trim();
}

async function readCatalog() {
  try {
    return await readJson(resolve(ROOT, "releases/game-cdn/catalog.json"));
  } catch {
    return { schemaVersion: 1, games: [] };
  }
}

function gameRoot(id) {
  return resolve(ROOT, "games", id);
}

function requireId(value) {
  if (typeof value !== "string" || !GAME_ID.test(value))
    throw new Error("id must be a kebab-case game id (2-64 chars)");
  return value;
}
function requireText(value, name, min, max) {
  if (typeof value !== "string") throw new Error(`${name} must be a string`);
  const text = value.trim();
  if (text.length < min || text.length > max)
    throw new Error(`${name} must be ${min}-${max} chars`);
  return text;
}
function requireInteger(value, name, min, max) {
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`${name} must be an integer from ${min} to ${max}`);
  return value;
}
function requireEnum(value, allowed, name) {
  if (typeof value !== "string" || !allowed.has(value))
    throw new Error(`${name} must be one of: ${[...allowed].join(", ")}`);
  return value;
}
function normalizeControlTokens(value) {
  if (!Array.isArray(value) || value.length === 0)
    throw new Error("controls must be a non-empty array");
  const tokens = value.map((item) => requireEnum(item, CONTROL_TOKENS, "control"));
  const directional = tokens.filter((item) => ["stick", "dpad", "touchpad"].includes(item));
  if (directional.length > 1)
    throw new Error("Use at most one of stick, dpad, or touchpad in a scaffold");
  if (new Set(tokens).size !== tokens.length)
    throw new Error("controls must not contain duplicates");
  return tokens;
}
function normalizeModes(value) {
  if (!Array.isArray(value) || value.length === 0)
    throw new Error("modes must be a non-empty array");
  const modes = value.map((item) => requireEnum(item, MODES, "mode"));
  return [...new Set(modes)];
}
function requireSemver(value, name) {
  if (typeof value !== "string" || !SEMVER.test(value))
    throw new Error(`${name} must be semantic version x.y.z`);
  return value;
}
function compareSemver(left, right) {
  const parse = (value) => value.split("-", 1)[0].split(".").map(Number);
  const a = parse(left);
  const b = parse(right);
  for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  return left === right ? 0 : left.includes("-") ? -1 : 1;
}
function optionalSource(value) {
  return value === undefined ? undefined : requireSource(value, "source");
}
function requireSource(value, name) {
  if (typeof value !== "string" || value.trim().length < 20 || value.length > 96_000)
    throw new Error(`${name} must be source text between 20 and 96000 chars`);
  return value;
}
function ensureTrailingNewline(value) {
  return value.endsWith("\n") ? value : `${value}\n`;
}
async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}
async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
async function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 28_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `${command} ${args.join(" ")} failed: ${(result.stderr || result.stdout || "unknown error").trim()}`,
    );
  return result.stdout.trim();
}
