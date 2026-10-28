# Play Together agent rules

Current main: **0.25.1** (`25d8f25` family). Production: https://game.rahmanef.com  
Agent checkout: `~/agent-work/play-together` (not `~/projects`). MSO project: `d6fe524d6c327b1b6909a7ab3854e080/play-together`.  
Report status to **manef**. Local commits only unless Rahman gives an explicit GO to push/PR/merge/deploy. Do not use Cursor cloud agents for this repo unless Rahman explicitly asks.

## Non-negotiable architecture

1. Games may import only `@play-together/game-sdk`, `@play-together/contracts`, and their own files.
2. Platform packages and apps must never statically import a concrete `games/*` package.
3. A game release is immutable and addressed by `gameId`, `version`, manifest URL, and SHA-256 digest.
4. Existing rooms stay pinned to their original release. Never mutate or auto-upgrade an active room. `retired` blocks new rooms but preserves pinned rooms; `blocked` is the emergency path that immediately closes already-live exact-release sessions and denies new tickets/reconnects too.
5. Convex is the durable control plane. Never write controller frames or snapshots to Convex at tick rate.
6. The realtime gateway is transient and authoritative. One game crash must not stop another room.
7. Browser game code runs only inside the sandboxed frame and communicates through validated messages.
8. Server game modules are trusted publisher code. Do not market worker threads as an OS security sandbox.
9. Do not add compatibility files, duplicate APIs, re-export shims, placeholder modules, or second sources of truth.
10. Do not commit `.env`, admin keys, game-publish tokens, join-ticket secrets, JWT keys, or generated local state.

## Stack map (key paths)

```text
apps/web                 browser shell, feature slices, sandboxed game frame
apps/realtime            WebSocket gateway + per-room workers
  src/features/rooms/    room manager, session, Redis/in-memory coordinators
  src/features/releases/ blocked-release Redis mirror + Pub/Sub
convex/                  durable auth, rooms, tickets, catalog facades
packages/contracts       wire/manifest/ticket schemas
packages/game-sdk        game runtime interfaces
packages/browser-runtime verified browser asset/realtime client
games/<id>               isolated cartridges (six in source catalog)
releases/game-cdn        immutable published bytes + catalog policy
docs/agent-onboarding.md task-routing map (read before repo-wide refactors)
infra/vps/               Dokploy/Traefik production compose
```

Games in source: `turbo-circuit`, `flight-trainer`, `sky-strike`, `ridge-rush`, `clash-arena`, `ibu-ibu-telur-gulung`. Source versions do not imply production or an open room has upgraded.

## Realtime room coordination

- Production sets `REDIS_URL` and `REQUIRE_DISTRIBUTED_COORDINATION=true` (see `infra/vps/docker-compose.production.yml`). Local defaults keep coordination optional (`REQUIRE_DISTRIBUTED_COORDINATION=false`).
- With `REDIS_URL`, the gateway uses `RedisRoomCoordinator` + `RedisReleaseControl`. Without Redis, coordinators are disabled unless tests inject one; if `REQUIRE_DISTRIBUTED_COORDINATION=true` without Redis/coordinators, startup fails.
- Ownership under `apps/realtime/src/features/rooms/`:
  - `room-coordinator.ts` — coordinator interface + authority election
  - `redis-room-coordinator.ts` / `redis-room-protocol.ts` — distributed presence/input/snapshot fan-out
  - `in-memory-room-coordinator.ts` — single-process test/dev stand-in
  - `room-session-distribution.ts` — session wiring to the coordinator
- Redis is **not** durable SSOT. Room/release policy stays in Convex/catalog; Redis only mirrors blocked-release identity for immediate cross-instance revocation and coordinates transient presence/input/snapshots across replicas.
- Same-origin realtime path in production: `/api/realtime`.

## Environment notes

- Names and deployment rules: `.env.example`, `docs/environment.md`, `docs/deployment.md`.
- Local self-hosted Convex uses `CONVEX_SELF_HOSTED_URL` + `CONVEX_SELF_HOSTED_ADMIN_KEY`. Cloud/prod deploy tooling uses `CONVEX_DEPLOYMENT`. **Do not set both in the same process** — `scripts/bootstrap-local.mjs` deletes `CONVEX_DEPLOYMENT` / `CONVEX_DEPLOY_KEY` before local deploy for this reason.
- Never expose the Convex dashboard publicly. Bind local admin/data ports to loopback only.
- `.mso/` is local MSO runtime state (gitignored). Do not force-add it.

## File and ownership budget

- Maintained `.ts`, `.tsx`, `.js`, `.mjs`, and `.css` implementation files must stay at or below 200 lines. `pnpm architecture:check` enforces this.
- Split by real ownership (model, lifecycle, protocol, renderer, HUD, scene), never by arbitrary `part1`/`part2` chunks.
- Web features may not import sibling feature internals. `shared` and `frame` may not depend on feature slices.
- Prefer existing semantic CSS custom properties; do not recreate global monolithic stylesheets.
- `README.md` is orientation; `docs/agent-onboarding.md` is the task-routing map.

## Vertical-slice flow

Organize changes by user capability, not by generic technical layer:

- identity and registration;
- published game catalog;
- room discovery and creation;
- password and capacity admission;
- connection-ticket issuance;
- realtime room lifecycle;
- device modes and game frame;
- game publication;
- operations and security.

A slice may span UI, Convex, contracts, gateway, game SDK, and tests. Keep its public boundary explicit and avoid reaching into another slice's internals.

## SSOT

- Convex generated API: `convex/_generated/api`.
- Wire and manifest schemas: `packages/contracts`.
- Game runtime interfaces: `packages/game-sdk`.
- Published release catalog: immutable manifests in the game CDN plus registered digest/status in Convex. Change host playability policy through `game.release_status`, never by rewriting release bytes.
- Environment names and deployment rules: `.env.example` and `docs/deployment.md`.
- Commands and verification gates: root `package.json` (`pnpm verify`, `pnpm verify:stack`).
- Agent task routing: `docs/agent-onboarding.md`.
- Canonical game-submission prompt: `docs/game-submission-prompt.txt`.
- Production hosting: VPS/Dokploy + Convex Cloud (see `docs/deployment.md`). Do not invent Dokploy project/app inventory from memory — verify via live ops tools when needed.

## Required verification

Before merging or pushing:

```bash
pnpm lint
pnpm architecture:check
pnpm typecheck
pnpm test
pnpm build
pnpm smoke:realtime
pnpm security:check
```

Or the umbrella: `pnpm verify`. For auth, rooms, mode launch, manifests, gateway, Compose, or browser code, recreate the local stack and run:

```bash
pnpm stack:bootstrap
pnpm test:e2e
```

A task is not complete because compilation passes. Verify the real registration, admission, pairing, input, snapshot, and reconnect paths.

## Change discipline

- Prefer deletion over keeping obsolete imports alive.
- Add a regression test for every fixed bug.
- Use exact versioned contracts; reject unknown schema/protocol versions.
- Use constant-time comparisons for secrets/signatures where practical.
- Keep public error messages bounded and do not leak internals.
- Never print or commit secrets (`GH_PAT_*`, `COMPOSIO_KEY_*`, admin keys, ticket secrets, JWT keys).
- A new game must prove a distinct controller or display behavior, not merely reuse a platform placeholder.
- Do not push, open a PR, merge, or deploy without explicit Rahman GO (except when an SI-Coder rule already grants that step).
