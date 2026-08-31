# Agent onboarding

Use this document when entering Play Together without prior session context. It explains where a change belongs, which source is authoritative, and how to prove the result without reverse-engineering the repository again.

## 1. Read in this order

1. `AGENTS.md` — non-negotiable architecture and safety rules.
2. `README.md` — product/runtime mental model and commands.
3. This file — task routing and ownership.
4. Domain doc only when needed: `architecture.md`, `game-sdk.md`, `submitting-games.md`, `deployment.md`, or `security.md`.

Do not start by editing generated registry/release files or by searching for a convenient global stylesheet.

## 2. Core invariants

- Convex is durable control-plane SSOT; realtime is transient authoritative play state.
- A room is pinned to `gameId + gameVersion + manifestSha256`.
- Published game bytes are immutable. Byte changes require a new semantic version.
- The platform knows contracts and presentation metadata, never concrete game mechanics.
- A concrete game imports only its own files plus stable game SDK/contracts boundaries.
- Browser game code runs in the sandboxed game frame; server games run in per-room workers.
- Standard controller behavior is declarative in `game.config.json`.
- Remote QR/device-role/split-screen orchestration belongs to the platform, not games.
- Maintained implementation files are limited to 200 lines by `architecture:check`.
- New styles use existing CSS custom properties first; add a token only when it represents a reusable semantic value.

## 3. Vertical-slice routing

| User-visible task | Primary owner | Typical supporting owner |
| --- | --- | --- |
| sign in/register/reset | `apps/web/src/features/auth` | Convex auth functions |
| browse/create rooms | `features/lobby` | `convex/rooms.ts` + `_shared/rooms/*` |
| room invite/membership/mode launch | `features/room` | rooms/tickets |
| pre-game/QR/live game shell | `features/play` | frame runtime + realtime gateway |
| phone controller rendering | `apps/web/src/frame/controller` | frame style slices + game config |
| shared/per-player display composition | `apps/web/src/frame/displayManager.ts` | game presentation metadata |
| room WebSocket lifecycle | `apps/realtime/src/features/rooms` | browser runtime/contracts |
| template marketplace | `features/templates` | `convex/templates.ts` + `_shared/templates/*` |
| ops/developer UI | matching `features/ops` / `features/developers` | generated docs/registry |
| one game mechanic/visual | `games/<id>` only | stable SDK/contracts |
| game lifecycle tool | `scripts/game-admin/*` | `.mso/functions.json` / MCP server |

A page should mostly compose slice state and view components. Data fetching/mutations belong in the slice model; imperative browser protocol work belongs in a runtime adapter; visual sections belong in focused components.

## 4. Web structure

```text
apps/web/src/
  app/                  provider/router composition only
  features/<slice>/
    <Page>.tsx          page composition
    model/              query/mutation/local state hooks
    components/         slice-owned presentation
    *.css               slice-owned styles
  shared/               true cross-feature primitives
  frame/                sandbox/game frame + controller/display runtime
  styles/               app foundation/tokens only
```

Do not create generic `components/`, `utils/`, or `helpers/` at the repository root to avoid deciding ownership. Promote code to `shared` only after it is genuinely used across independent slices and has no feature knowledge.

## 5. Convex structure

Public module names are API stability boundaries. Keep declarations such as `convex/rooms.ts` small and preserve `api.rooms.*` paths. Put business rules in private domain modules:

```text
convex/_shared/rooms/
  validators.ts   external args
  actions.ts      action orchestration
  queries.ts      read models
  mutations.ts    authoritative writes/admission
  lifecycle.ts    start/menu/heartbeat/leave/close
  validation.ts   pure domain validation
  types.ts        private domain types
```

Templates follow the same facade/private-domain pattern with catalog, publication, entitlement, purchase, and download concerns.

## 6. Realtime structure

`RoomSession` is an orchestrator, not a god object:

- `room-game-worker.ts` owns worker readiness/lifecycle and game messages;
- `room-session-clients.ts` owns WebSocket clients, rate pressure, presence broadcast;
- `room-session-distribution.ts` owns cross-instance coordinator state;
- `redis-room-coordinator.ts` owns Redis handle behavior;
- `redis-room-protocol.ts` owns event parsing/Redis construction constants.

Do not move durable room state into Redis or snapshots into Convex.

## 7. Game slice structure

Start small. Split only when a cohesive concern becomes large:

```text
games/example/
  game.config.json
  src/server.ts
  src/server/model.ts         # domain math/types if needed
  src/server/combat.ts        # mechanic subsystem if needed
  src/display.ts
  src/display/scene.ts        # world construction
  src/display/hud.ts          # HUD/minimap
  src/display/<renderer>.ts   # asset/vehicle/entity renderer
```

Never solve a game-specific problem by adding an identity switch to the host. `displayLabel`, layout, shell preset, presentation mode, assets, and controls are metadata/contract concerns.

## 8. CSS/WYSIWYG rules

- Feature CSS stays next to the feature; frame CSS stays under `frame/styles`.
- `styles/tokens.css` owns app spacing/radius/color tokens; `frame/styles/tokens.css` owns console tokens.
- Prefer custom properties over copied spacing/radius/color literals.
- Preserve cascade intentionally. Do not use `!important` to compensate for unclear ownership; legacy compatibility overrides are isolated in `legacySurface.css`.
- Responsive behavior belongs with the component/feature it changes.
- DOM structure, interactive state, and rendered preview should share the same data source; do not create a separate “editor-only” representation of runtime behavior.

## 9. Generated and immutable files

Do not hand-edit these as primary sources:

- `apps/web/public/game-registry.json` — generated by `pnpm game:registry`;
- `apps/web/public/docs/*` — generated by `pnpm docs:sync`;
- `releases/game-cdn/catalog.json` and versioned game release files — generated by publication;
- `convex/_generated/*` — generated by Convex;
- build output such as `dist/`.

Change the source, run the generator, then commit generated tracked output only when repository policy expects it.

## 10. Verification matrix

Always run the smallest relevant checks while editing, then the full gate before merge.

| Change | During iteration | Before merge |
| --- | --- | --- |
| web slice/style | web typecheck/build + targeted test | `pnpm verify` |
| Convex domain | `pnpm typecheck:convex` + relevant tests | `pnpm verify` |
| realtime | realtime typecheck/tests | `pnpm verify` + stack/E2E if protocol behavior changed |
| game | game typecheck/tests/build | immutable publish + `pnpm verify` + relevant E2E |
| QR/room/device modes | targeted Playwright | full `pnpm test:e2e` |
| deploy/runtime config | config/smoke | CI + production health/browser verification |

`pnpm architecture:check` must remain green throughout structural work.

## 11. Shipping sequence

1. Sync with `origin/main` in an isolated clean worktree.
2. Make one coherent slice change; delete obsolete files/imports rather than keeping shims.
3. Run targeted checks.
4. Generate required docs/registry/new immutable releases.
5. Run `pnpm verify`.
6. Recreate/verify the integration stack when browser/runtime behavior changed; run full E2E.
7. Review `git diff` for generated secrets, stale files, or accidental historical release mutation.
8. Commit the exact verified state, push/review/merge to `main`.
9. Wait for CI verify/integration/deploy-managed.
10. Independently verify production version, health, relevant assets/manifests, and browser scenario.

Never declare completion based only on compilation or a local page render.
