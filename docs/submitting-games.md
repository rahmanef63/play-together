# Submit a new game

Play Together treats each game as an isolated vertical slice. A game is accepted only when the platform discovers it from its own config, its authoritative server runs independently, and a new release can be published immutably without adding game-specific logic to the portal.

## Required slice

```text
games/<game-id>/
  game.config.json
  package.json
  tsconfig.json
  src/
    server.ts
    server.test.ts
    display.ts
```

`game.config.json` is the SSOT for identity, version, player limits, runtime modes, orientation, controller topology, and host presentation. The portal registry is generated; never add game names to a portal switch, title heuristic, or handwritten registry.

A built-in controller does not need `src/controller.ts`. Use a custom controller bundle only when the declared primitives cannot represent the control surface.

## Controller topology

Use only the controls the game needs:

- `stick`: analog X/Y;
- `dpad`: digital directions;
- `button`: actions, face buttons, shoulders, triggers, start/select;
- `touchpad`: normalized pointer/touch input.

Layouts are `gamepad`, `arcade`, `racing`, `flight`, or `touch`. Layout is presentation metadata; the `controls` array is authoritative. Keep physical `face` placement separate from semantic `displayLabel` such as `BOOST`, `CANNON`, `FLAPS`, or `GEAR`.

Do not teach the host renderer game-specific labels. If a control means something semantic, declare it in the game config.

## Remote display presentation

Declare one of these policies in `presentation.remoteDisplay`:

```json
{ "mode": "shared", "maxViewports": 1 }
```

Use `shared` for one communal board/arena.

```json
{ "mode": "per-player", "maxViewports": 4 }
```

Use `per-player` only when each remote needs its own camera, vehicle, cockpit, or private focus. The platform owns QR join, device roles, connected-controller presence, shared/split composition, and join/leave transitions. A per-player display uses `ctx.playerId`; it does not implement split-screen orchestration.

Each display mount must scope DOM/canvas work to its supplied root and dispose all listeners, observers, animation frames, renderers, textures, and other resources when unmounted.

## Runtime rules

1. `src/server.ts` is authoritative. Controllers send intent; clients never decide trusted state such as wins, collisions, scores, health, or inventory.
2. `src/display.ts` renders snapshots and fills its supplied surface at 100% width/height. Do not impose viewport-sized minimum heights.
3. Resize Canvas/WebGL drawing buffers only when container dimensions change, never every animation frame.
4. Game code may depend only on the stable game SDK/contracts boundary and its own slice.
5. Any byte-changing update to an already-published cartridge requires a greater semantic version.
6. Keep maintained implementation files at or below the repository 200-line budget; split by cohesive game concern when necessary.

## Immutable static game assets

Runtime assets are declared in `games/<id>/assets/runtime/asset-manifest.json`. Use them for actual game assets—sprite sheets, game asset sheets, tilesets, vehicles, props, track/world art, audio, and data—not host UI chrome.

The build copies only declared files into the immutable cartridge and pins SHA-256 plus byte size. Browser modules access them through `BrowserGameContext.loadAsset(name)`, which verifies the digest before returning the blob. Source/reference sheets stay under `assets/source/` and are not published automatically.

## MCP and project tools

The repository exposes the same bounded lifecycle through `.mcp.json` and `.mso/functions.json`:

| Operation | Purpose |
| --- | --- |
| `game_list` / `game.list` | discover slices and release state |
| `game_get` / `game.get` | inspect one game/config/history |
| `game_create` / `game.create` | create one draft slice |
| `game_update` / `game.update` | update with optimistic version protection |
| `game_delete` / `game.delete` | delete unpublished drafts only |
| `game_validate` / `game.validate` | discovery + typecheck + tests + build |
| `game_publish` / `game.publish` | create a local immutable release |
| `game_registry` / `game.registry` | regenerate portal discovery |
| `game_prompt` / `game.prompt` | return the canonical agent prompt |

Production publication remains a verified `main`-branch CI responsibility. Project tools never bypass immutable release guards or receive production deployment credentials.

Normal flow:

```text
game_get → game_create/game_update → game_validate → relevant browser test
→ game_publish → game_registry → repository verify → reviewed main commit → managed CI deploy
```

## Canonical AI coding-agent prompt

The copy-ready prompt lives at [`docs/game-submission-prompt.txt`](game-submission-prompt.txt). It is the only source for:

- repository tool `game_prompt` / `game.prompt`;
- the public `/developers` copy action;
- `apps/web/public/docs/submitting-games.prompt.txt` generated by `pnpm docs:sync`.

Do not paste a second copy into another markdown file.

## Validation before submission

```bash
pnpm game:tools:sync
pnpm docs:sync
pnpm game:build
pnpm game:registry
pnpm test
pnpm typecheck
pnpm lint
pnpm architecture:check
pnpm game:publish:one <game-id>
pnpm verify
```

For UI/gameplay changes also run:

```bash
pnpm stack:bootstrap
pnpm test:e2e
```

The submission is complete only when the generated registry contains the game, the immutable release is reproducible, the browser can open the display and every declared control, and no historical release bytes changed.

## Review checklist

Reject a submission when any of these are true:

- portal code imports/recognizes the game by identity or title;
- a built-in controller is duplicated in `src/controller.ts`;
- the client decides trusted gameplay state;
- the display assumes a fixed viewport or resizes its buffer every frame;
- an existing semantic release is overwritten;
- the game cannot be removed without breaking unrelated games;
- registry, manifest, tests, and controller topology disagree;
- `presentation.remoteDisplay` is missing/invalid;
- a per-player display ignores `ctx.playerId`;
- implementation files grow past the enforced line budget instead of being sliced by concern.
