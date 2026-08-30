# Submit a new game

Play Together treats every game as an isolated vertical slice. A game is accepted only when the portal can discover it from its own config, the authoritative server can run it independently, and its release can be published immutably without adding game-specific logic to the portal.

## Required slice

Create exactly one folder:

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

`game.config.json` is the single source of truth for identity, version, player limits, modes, orientation, controller topology, and host display presentation. Do not add the game name to a switch statement or hardcoded registry in the web app. `pnpm game:registry` discovers the slice automatically.

A built-in controller does **not** need `src/controller.ts`. Define its controls in `game.config.json` using the declarative console primitives. A custom controller bundle is reserved for a control surface that cannot be represented by the built-in renderer.

## Controller topology

Choose the smallest control surface the game actually needs. Available primitives include:

- `stick` for analog X/Y input.
- `dpad` for digital directions.
- `button` for A/B/X/Y, shoulders, triggers, start/select, or game-specific actions.
- `touchpad` for normalized pointer/touch coordinates.

The console layout can be `gamepad`, `arcade`, `racing`, `flight`, or `touch`. Layout is presentation metadata; the `controls` array is authoritative for which inputs exist.

Example: analog movement + A/B only.

```json
{
  "controller": {
    "supportsRemote": true,
    "supportsHandheld": true,
    "preferredOrientation": "adaptive",
    "console": {
      "renderer": "builtin",
      "layout": "gamepad",
      "controls": [
        {
          "id": "move",
          "kind": "stick",
          "label": "Move",
          "zone": "left",
          "input": "move"
        },
        {
          "id": "a",
          "kind": "button",
          "label": "A",
          "zone": "right",
          "input": "action",
          "value": "primary"
        },
        {
          "id": "b",
          "kind": "button",
          "label": "B",
          "zone": "right",
          "input": "action",
          "value": "secondary"
        }
      ]
    }
  }
}
```

If the game needs A/B/X/Y, add four `button` entries. If it needs racing controls, declare the steering stick/buttons/triggers and set `layout` to `racing`; do not make the portal infer racing from the title.

## Remote display presentation

Every game must declare how a TV/laptop should present multiple connected phone remotes. This is host metadata in `game.config.json`; it is generated into the portal registry and deliberately stripped from the immutable cartridge manifest before hashing.

Use one communal view when every player should see the same board/arena:

```json
{
  "presentation": {
    "remoteDisplay": {
      "mode": "shared",
      "maxViewports": 1
    }
  }
}
```

Use per-player views when each remote needs its own camera, vehicle, cockpit, or private focus:

```json
{
  "presentation": {
    "remoteDisplay": {
      "mode": "per-player",
      "maxViewports": 4
    }
  }
}
```

The platform owns device-role detection, live remote discovery, split-grid composition, join/leave transitions, and the one-to-four viewport layout. **Do not implement split-screen orchestration inside the game.** A per-player `src/display.ts` must instead use `ctx.playerId` as the player/camera/focus for the surface it is given. The platform may mount the same verified display module multiple times in one sandboxed frame, all subscribed to the same authoritative snapshot stream.

A display must therefore scope DOM/canvas work to its supplied root, avoid document-global IDs/selectors for game state, and fully dispose its own renderer/listeners/resources. With one remote, a per-player game stays as one shared-size viewport; with two or more remotes it automatically splits up to `maxViewports`, and it collapses again when remotes leave.

## Runtime rules

1. `src/server.ts` is authoritative. Clients send intent; clients do not decide wins, collisions, scores, health, inventory, or other trusted state.
2. `src/display.ts` renders only the snapshot supplied by the runtime. It must fill the surface given to it (`width: 100%`, `height: 100%`) and must not impose a fixed or minimum viewport height. For `per-player` presentation, use `ctx.playerId` to choose the current viewport's player/camera and support multiple independent mounts of the same display module.
3. Canvas/WebGL drawing buffers may be resized only when the container dimensions actually change. Do not assign `canvas.width`, `canvas.height`, or call `renderer.setSize()` every animation frame.
4. Cleanup every animation frame, timer, subscription, listener, `ResizeObserver`, WebGL renderer, and allocated GPU resource when the display unmounts.
5. The game may depend only on the stable game SDK/contracts boundary. It must not import portal internals, Convex internals, or another concrete game.
6. Existing published versions are immutable. Any byte-changing update requires a new semantic game version.

## MCP and tool calling

The repository exposes the same game lifecycle through two bounded project-owned tool surfaces:

- `.mcp.json` starts the local stdio MCP server with `pnpm mcp:game`.
- `.mso/functions.json` exposes the same operations to MSO through fixed argv and JSON stdin. Caller values are never interpolated into shell commands.

Available operations:

| Tool | Purpose | Safety boundary |
| --- | --- | --- |
| `game_list` / `game.list` | Discover all slices and current release state. | Read only. |
| `game_get` / `game.get` | Read one config, topology, package version, and release history. | Read only. |
| `game_create` / `game.create` | Create one `0.1.0` draft slice. | Never publishes production. |
| `game_update` / `game.update` | Update metadata/source with `expectedVersion`. | Published cartridge byte changes require a greater `newVersion`; host-only `remoteDisplay`/`maxViewports` may change without rewriting a release. |
| `game_delete` / `game.delete` | Remove a draft slice. | Refuses any game with a historical immutable release. |
| `game_validate` / `game.validate` | Run discovery, typecheck, unit test, and game build. | Does not publish. |
| `game_publish` / `game.publish` | Create the local immutable archive release. | Production Convex registration is intentionally excluded. |
| `game_registry` / `game.registry` | Regenerate portal discovery from configs. | Generated only; no hand-written registry entry. |
| `game_prompt` / `game.prompt` | Return this document's canonical full submission prompt. | Read only. |

A tool call is not permission to bypass repository gates. **Production publish remains a verified main-branch CI responsibility.** The project tools do not receive Vercel, Convex production, Resend, or other deployment credentials. A normal flow is:

```text
game_get (when editing) → game_create/game_update → game_validate → browser test if UI changed
→ game_publish → game_registry → repository verify → reviewed main commit → CI managed deploy
```

For a brand-new game, the generated starter is deliberately a draft scaffold. Replace the starter mechanics with the requested real game before publishing; do not sell or ship the starter behavior as a finished game.

## Validation before submission

From the repository root:

```bash
pnpm game:tools:sync
pnpm docs:sync
pnpm game:build
pnpm game:registry
pnpm test
pnpm typecheck
pnpm lint
pnpm game:publish:one <game-id>
pnpm verify
```

For UI/gameplay changes, also run the browser integration suite:

```bash
pnpm stack:bootstrap
pnpm test:e2e
```

The submission is not complete until the generated registry contains the game, the release manifest is immutable and reproducible, tests pass, and the browser can open both the display and every declared controller input.

## Base prompt for an AI coding agent

Copy the prompt below and replace every `<...>` placeholder. It is intentionally written so a non-technical contributor can describe the game without designing the repository architecture manually.

```text
You are adding one new multiplayer game to the Play Together monorepo.

Game idea:
- Name: <human readable game name>
- Short description: <what players do>
- Player count: <minimum> to <maximum>
- Win/round condition: <how a round ends or how a winner is determined>
- Visual direction: <simple description of the look>
- Preferred phone orientation: <portrait | landscape | adaptive>
- Play modes: <remote/shared screen, handheld, or both>
- TV/laptop presentation: <shared for one communal view | per-player for automatic split camera/focus>
- Controls needed: <for example analog + A/B, D-pad + A/B/X/Y, racing steering + gas/brake, flight stick + triggers, touch aiming, etc.>
- Important mechanics: <movement, collision, scoring, enemies, timing, items, checkpoints, etc.>

Implementation requirements:
1. Create a self-contained vertical slice at games/<kebab-case-id>/ with game.config.json, package.json, tsconfig.json, src/server.ts, src/server.test.ts, and src/display.ts.
2. game.config.json is the SSOT. Declare all standard controller controls there. Use the built-in controller renderer whenever possible; do not create src/controller.ts for a built-in console.
3. Do not add any game-specific switch, if/else, title heuristic, registry entry, or import to the main portal. The generated game registry must discover the slice automatically.
4. Keep gameplay server-authoritative. The controller sends player intent; the server decides trusted state; the display renders snapshots.
5. Make the display fill the provided surface at 100% width and height with no fixed/minimum viewport height. Resize Canvas/WebGL buffers only when dimensions change, never every animation frame.
6. Choose the smallest controller topology that matches the game. It must support only the buttons/sticks/touch surfaces the game needs. If it needs A/B only, do not expose X/Y. If it needs A/B/X/Y or shoulders/triggers, declare them explicitly.
7. Declare `presentation.remoteDisplay` explicitly. Use `shared` + `maxViewports: 1` for a communal board/arena. Use `per-player` (maximum 4) only when each remote needs its own camera/focus. For per-player presentation, render the supplied surface from `ctx.playerId`; do not implement split-grid/device discovery in the game.
8. Add meaningful server unit tests for core mechanics and at least one browser assertion for the unique gameplay/control surface.
9. Do not modify or overwrite any historical release. Start at version 0.1.0 for a new game; after any published byte change, bump semantic version before publishing again.
10. Run formatting, lint, typecheck, tests, game build, registry generation, immutable publish, repository verify, and relevant Playwright integration tests.
11. Update docs only where the new game adds information that is not already generated from the registry. Do not duplicate SSOT data manually.
12. If project MCP/tool calling is available, prefer `game_get`, `game_create`/`game_update`, `game_validate`, `game_publish`, and `game_registry` for their intended bounded operations. Never use a tool to bypass semantic versioning or immutable release guards.
13. `game_publish` creates only the local immutable release. Never register or mutate production directly from the game tool. Production publication must happen from a verified `main` commit through the repository CI/deploy workflow.
14. For UI changes, test realistic phone portrait and short landscape viewports. Confirm the game and its controls fill their assigned surface, no native scrollbar leaks into the PWA, and no control is clipped by safe areas or app chrome.
15. Run the relevant Playwright scenario and then the full repository `pnpm verify` gate. If the task includes shipping, commit only the exact verified state, push `main`, wait for CI `verify`, `integration`, and `deploy-managed`, and independently verify production before declaring completion.
16. Never expose deployment/auth/email secrets, never clear a user's authentication state as part of an app-cache update, and never weaken rate limits, signed tickets, manifest verification, or server authority to make a test pass.

Before finishing, report:
- game folder and version
- declared controller layout and every control ID
- declared remote display policy (`shared` or `per-player`) and viewport cap
- server-authoritative mechanics implemented
- tests added and their result
- immutable manifest path/SHA
- confirmation that no portal hardcoding was added
- confirmation that the existing games/releases remain unchanged
- the exact local validation/E2E commands run and their result
- if shipped, the verified main SHA and CI/deployment result; otherwise state clearly that production was not touched
```

## Review checklist

Reject a submission if any of these are true:

- Portal code imports the new game or recognizes it by title/name.
- A built-in controller is duplicated in `src/controller.ts`.
- The client is authoritative for trusted gameplay state.
- The display assumes a hardcoded viewport or resizes its drawing buffer every frame.
- The new release overwrites an existing semantic version.
- The game folder cannot be removed without breaking unrelated games.
- The registry, manifest, or tests disagree about the controller topology.
- `presentation.remoteDisplay` is missing/invalid, or a per-player display ignores `ctx.playerId` and cannot be mounted independently per viewport.
