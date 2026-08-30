<div align="center">

# Play Together

### Your phone is the console.

A version-isolated multiplayer game platform for **mobile controllers**, **handheld play**, and **shared browser/TV screens** — built so each game can ship independently without coupling the whole platform.

[![CI](https://github.com/rahmanef63/play-together/actions/workflows/ci.yml/badge.svg)](https://github.com/rahmanef63/play-together/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node.js-22%2B-339933?logo=nodedotjs&logoColor=white)](package.json)
[![pnpm](https://img.shields.io/badge/pnpm-10-F69220?logo=pnpm&logoColor=white)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](tsconfig.base.json)

**[Live app](https://game.rahmanef.com)** · [Architecture](docs/architecture.md) · [Game SDK](docs/game-sdk.md) · [Submit a game](docs/submitting-games.md) · [Deployment](docs/deployment.md) · [Security](docs/security.md)

</div>

<p align="center">
  <img src="docs/media/play-together-gameplay.gif" alt="Play Together shared-screen gameplay controlled from a mobile browser" width="100%" />
</p>

> The gameplay above is captured from the real end-to-end test stack: an authoritative shared display on desktop and a live controller on mobile.

## What it does

One multiplayer session can expose different surfaces to different devices:

| Mode | What the player sees | Typical use |
|---|---|---|
| **Shared screen + phone remote** | Authoritative game on browser/TV + controls on the current phone | Couch multiplayer, projector, desktop, TV |
| **Handheld console** | Live game screen + controls in one device | Game Boy-style portrait or PSP-style landscape play |

The launch UI treats the shared screen and phone remote as one experience. Handheld mode loads the exact pinned release's `display` and `controller` modules together over one realtime connection, so the phone is a complete playable console rather than a detached button panel. The game manifest still decides supported modes and orientation.

<table>
<tr>
<td width="34%"><img src="docs/media/pong-mobile-remote.png" alt="Pong remote controller on mobile" /></td>
<td width="33%"><img src="docs/media/tap-race-handheld.png" alt="Tap Race handheld portrait mode" /></td>
<td width="33%"><img src="docs/media/tap-race-handheld-landscape.png" alt="Tap Race handheld landscape mode" /></td>
</tr>
<tr>
<td align="center"><b>Remote controller</b></td>
<td align="center"><b>Handheld portrait</b></td>
<td align="center"><b>Handheld landscape</b></td>
</tr>
</table>

## Mobile console shell

The phone console chassis is a platform concern; each cartridge still owns its actual buttons, sticks, gestures, and input semantics. Remote mode is **screenless** and landscape-first, while handheld mode mounts the pinned display and controller together. The verified manifest may set `controller.shellPreset` to `classic`, `racing`, or `flight`; older immutable releases remain compatible through a deterministic metadata fallback. The shell uses `100dvh`, safe-area insets, disabled accidental zoom/scroll, and touch-first sizing for iOS and Android.

## Why the architecture is different

A platform update should not force every game to move together, and a game release should not silently alter an active room.

Play Together therefore separates the platform from game releases:

- **Convex Cloud control plane** — users, authentication, published games, rooms, memberships, capacity, template entitlements, and signed connection/download tickets.
- **Vercel realtime gateway** — transient input, authoritative simulation, snapshots, presence, validation, and room lifecycle.
- **Vercel game CDN** — immutable, SHA-256-pinned browser/controller/server bundles served from the static deployment.
- **Vercel web shell / PWA** — registration, lobby, password reset, template marketplace, device-mode selection, and sandbox hosting.
- **Game workers** — one isolated worker per active room, pinned to one exact game release.
- **Games** — depend only on stable contracts/SDKs; platform code never imports a concrete game.

### Version isolation

Every room stores:

```text
gameId
gameVersion
manifestUrl
manifestSha256
```

Publishing `pong@0.3.0` does **not** overwrite `pong@0.2.0`. Existing rooms remain pinned to the previous manifest while new rooms can use the new release. Updating one game does not rebuild or mutate another game.

## Architecture

```mermaid
flowchart LR
  U[Registered player] --> W[Web shell / PWA]
  W -->|auth, lobby, rooms| C[(Convex control plane)]
  W -->|short-lived signed ticket| R[Realtime gateway]
  W -->|verified browser module| F[Sandboxed game frame]
  F -->|inputs / snapshots| R
  F -->|manifest + display/controller| G[Immutable game CDN]
  R -->|manifest + server module| G
  R -->|one room + exact version| X[Authoritative worker]
  P[Game publisher] -->|append release| G
  P -->|register digest| C
  T[Private template source] -->|encrypted transport / private object| B[Vercel Private Blob]
  W -->|entitlement ticket| B
```

The latency-sensitive input path never writes each frame to Convex. Convex is the durable control plane; the realtime gateway is the authoritative gameplay plane.

See [docs/architecture.md](docs/architecture.md) for vertical slices, boundaries, and trust assumptions.

## Product flow

1. Register with name, email, and password.
2. Create a public or private room.
3. Add an optional password independently of room visibility.
4. Share the room code or let players discover available public rooms.
5. Choose either **Shared screen + phone remote** or **Handheld console** for the pinned game release.
6. Convex issues a short-lived signed ticket pinned to the room and exact game release.
7. The realtime gateway validates the ticket and starts/reuses the room's authoritative worker.
8. Browser game modules receive only the scoped runtime bridge they need.

<p align="center">
  <img src="docs/media/room-desktop.png" alt="Play Together room setup on desktop" width="88%" />
</p>

## Repository layout

```text
apps/
  web/                 lobby, room launch, PWA, sandbox host
  realtime/            WebSocket gateway, module cache, room workers
games/
  pong/                classic two-player paddle game
  tap-race/            four-player rapid-tap race
  reaction-rush/       reflex / false-start duel
  memory-lights/       growing four-pad memory sequence
  snake-arena/         multiplayer grid snake
  dodge-dash/          continuous obstacle dodging
  target-blast/        coordinate-based touch aiming
  tug-war/             two-team rapid-input tug of war
  rhythm-pulse/        server-timed rhythm scoring
  maze-run/            server-authoritative grid maze
  stack-tower/         overlap-based timing tower race
  orbit-dodge/         angular movement and meteor avoidance
  turbo-circuit/       3D arcade racing with AI rivals and lap physics
  sky-strike/          3D fighter dogfight with cannon/missiles
  flight-trainer/      3D pilot training, instruments, stall and landing
packages/
  contracts/           versioned wire and manifest schemas
  game-sdk/            stable API allowed inside game implementations
  browser-runtime/     digest verification, iframe protocol, reconnecting WS client
  security/            ticket signing and verification
  emulator-sdk/        lawful-image and emulator adapter contracts
convex/                 auth, catalog, rooms, memberships, tickets
infra/                  game CDN and local Convex issuer bridge
releases/game-cdn/      tracked immutable game release archive
scripts/                discovery, build, publish, bootstrap, security checks
e2e/                    real browser multiplayer scenarios
docs/                   architecture, SDK, deployment, security, emulator roadmap
```

The repository follows a **vertical-slice architecture**. Cross-slice dependencies are checked by `pnpm architecture:check`.

### Included games

| Game | Players | Primary control | Gameplay |
|---|---:|---|---|
| Pong Together | 1–2 | Up / Down | Realtime paddle physics |
| Tap Race | 1–4 | Tap | Button-mashing race |
| Reaction Rush | 1–8 | Hit | Reflex + false-start timing |
| Memory Lights | 1–8 | Four color pads | Growing memory sequence |
| Snake Arena | 1–4 | D-pad | Grid movement, growth, collisions |
| Dodge Dash | 1–4 | Left / Right | Continuous obstacle survival |
| Target Blast | 1–8 | Touch coordinates | Precision target shooting |
| Tug War | 2–8 | Pull | Team input battle |
| Rhythm Pulse | 1–8 | Tap | Server-timed rhythm accuracy |
| Maze Run | 1–4 | D-pad | Authoritative maze race |
| Stack Tower | 1–4 | Drop | Timing and overlap stacking |
| Orbit Dodge | 1–4 | Rotate | Circular movement and meteor avoidance |
| Turbo Circuit | 1–4 | Steering + pedals + nitro | 3D circuit racing, checkpoints, laps, collisions and AI rivals |
| Sky Strike | 1–4 | Flight stick + weapons | 3D dogfight, lock-on, cannon, homing missiles and AI bandits |
| Flight Trainer | 1–4 | Yoke + throttle + systems | 3D takeoff, navigation, instruments, stall/crash and landing training |

Every game ships independent `display`, `controller`, and authoritative `server` bundles. Updating one cartridge does not require changing another game or migrating an active room.

#### Real gameplay previews

These thumbnails are captured from the running handheld runtime, not mockups.

<table>
<tr>
<td width="25%"><img src="apps/web/public/game-previews/pong.png" alt="Pong Together gameplay preview" /><br/><b>Pong Together</b></td>
<td width="25%"><img src="apps/web/public/game-previews/tap-race.png" alt="Tap Race gameplay preview" /><br/><b>Tap Race</b></td>
<td width="25%"><img src="apps/web/public/game-previews/reaction-rush.png" alt="Reaction Rush gameplay preview" /><br/><b>Reaction Rush</b></td>
<td width="25%"><img src="apps/web/public/game-previews/memory-lights.png" alt="Memory Lights gameplay preview" /><br/><b>Memory Lights</b></td>
</tr>
<tr>
<td><img src="apps/web/public/game-previews/snake-arena.png" alt="Snake Arena gameplay preview" /><br/><b>Snake Arena</b></td>
<td><img src="apps/web/public/game-previews/dodge-dash.png" alt="Dodge Dash gameplay preview" /><br/><b>Dodge Dash</b></td>
<td><img src="apps/web/public/game-previews/target-blast.png" alt="Target Blast gameplay preview" /><br/><b>Target Blast</b></td>
<td><img src="apps/web/public/game-previews/tug-war.png" alt="Tug War gameplay preview" /><br/><b>Tug War</b></td>
</tr>
<tr>
<td><img src="apps/web/public/game-previews/rhythm-pulse.png" alt="Rhythm Pulse gameplay preview" /><br/><b>Rhythm Pulse</b></td>
<td><img src="apps/web/public/game-previews/maze-run.png" alt="Maze Run gameplay preview" /><br/><b>Maze Run</b></td>
<td><img src="apps/web/public/game-previews/stack-tower.png" alt="Stack Tower gameplay preview" /><br/><b>Stack Tower</b></td>
<td><img src="apps/web/public/game-previews/orbit-dodge.png" alt="Orbit Dodge gameplay preview" /><br/><b>Orbit Dodge</b></td>
</tr>
<tr>
<td><img src="apps/web/public/game-previews/turbo-circuit.png" alt="Turbo Circuit gameplay preview" /><br/><b>Turbo Circuit</b></td>
<td><img src="apps/web/public/game-previews/sky-strike.png" alt="Sky Strike gameplay preview" /><br/><b>Sky Strike</b></td>
<td><img src="apps/web/public/game-previews/flight-trainer.png" alt="Flight Trainer gameplay preview" /><br/><b>Flight Trainer</b></td>
<td><b>15 independent cartridges</b><br/>3D games keep renderer code inside their own slices.</td>
</tr>
</table>

## Quick start

### Requirements

- Node.js 22+
- pnpm 10+
- Docker + Compose v2
- Chromium/Chrome for browser E2E tests

```bash
git clone https://github.com/rahmanef63/play-together.git
cd play-together
pnpm install
pnpm stack:bootstrap
```

Open **http://localhost:4173**.

`stack:bootstrap` creates local-only secrets, starts self-hosted Convex, publishes discovered games, deploys Convex functions, registers manifests, and launches the realtime/web stack. Secrets are written to ignored local files and are never printed.

Stop the stack without deleting the durable Convex volume:

```bash
pnpm stack:down
```

> Do not use `docker compose down -v` unless you intentionally want to delete local Convex data.

## Add a game

A game is a self-contained vertical slice:

```text
games/<game-id>/
  game.config.json   # identity + immutable version + console/control topology
  package.json
  src/display.ts
  src/server.ts
  src/*.test.ts
```

`game.config.json` is the slice SSOT. Standard phone controls are declarative (`stick`, `dpad`, `button`, `touchpad`) and support face buttons A/B/X/Y, shoulders/triggers, zones, keyboard bindings, and stateful actions. `pnpm game:registry` discovers every slice and generates the portal registry; the portal never hardcodes a game list. A custom `src/controller.ts` is reserved for a future non-builtin renderer and must not coexist with `controller.console.renderer = "builtin"`.

Game code may import only the stable game SDK/contracts boundary.

```bash
pnpm game:publish:one <game-id>
pnpm game:publish:convex:one <game-id>
```

Release rules:

1. Bump the game version.
2. Never mutate an already-published release.
3. Build/test the game independently.
4. Publish versioned bundles and their SHA-256 manifest.
5. Register the immutable manifest in Convex.
6. Existing rooms keep their pinned release.

Read [docs/game-sdk.md](docs/game-sdk.md) and [docs/submitting-games.md](docs/submitting-games.md) before implementing a new game. The submission guide includes a copy-ready base prompt for AI coding agents and the required validation checklist.

## Sell a game template

The public cartridges in this repository are MIT-licensed. Commercial/private source should therefore live outside Git under ignored `template-sources/<slug>/`, with its own license and checkout URL. Package and upload it to the connected Private Blob store with `pnpm template:pack <slug> --upload`, then publish the generated metadata with `pnpm template:publish <metadata.json>`.

The marketplace is payment-provider agnostic: each template can expose an HTTPS checkout URL, while a signed fulfillment webhook grants the Convex entitlement. Users who buy before registering can claim the pending purchase later with the same email.

## Production topology

The managed target removes the VPS from the runtime path:

| Surface | Production target | Notes |
|---|---|---|
| Player app + game CDN | Vercel | `https://game.rahmanef.com` |
| Realtime | Vercel WebSocket Function | same-origin `/api/realtime` |
| Durable control plane/auth | Convex Cloud | managed cloud/site endpoints |
| Paid template source | Vercel Private Blob | exact-path signed downloads |
| Cross-instance coordinator | optional Redis | transient only; not Convex replacement |

The small-scale managed release keeps one authoritative room in one Function instance. Browser reconnect is built in, but full horizontal room coordination is intentionally gated behind the optional transient coordinator.

Password reset is handled by Convex Auth and Resend using the shared sender `official@rahmanef.com`, with a project-specific display name/tag. Paid template source is kept outside this public MIT repository and is delivered only after a Convex entitlement check.

See [docs/deployment.md](docs/deployment.md) and [.env.production.example](.env.production.example).

## Verification

```bash
pnpm verify          # lint + architecture + typecheck + tests + build + smoke + audit
pnpm verify:stack    # realtime smoke + full browser multiplayer E2E
pnpm game:previews   # recapture all gameplay preview thumbnails from the running stack
pnpm stack:config    # validate merged Docker Compose config
```

The E2E suite covers:

- registration and sessions;
- public/private rooms;
- optional room passwords;
- public available-slot discovery;
- combined shared-screen + phone-remote launch flow;
- playable handheld screen + controls in portrait and landscape layouts;
- independently loaded games/controllers;
- authoritative WebSocket state;
- transactional final-slot contention.

The README media is captured from the same running integration stack.

For an already-deployed environment, set `E2E_BASE_URL` and `E2E_REALTIME_HEALTH_URL` to run the same browser scenarios against public HTTPS/WSS infrastructure.

## Security model

Important controls include:

- exact browser origin allowlists;
- PBKDF2 password hashing with per-secret salts plus a 12-character strong-password policy for new/reset passwords;
- enumeration-safe, rate-limited password reset through Resend;
- transactional room capacity;
- expiring HMAC-signed connection tickets;
- ticket replay protection;
- input schema validation and rate limiting;
- immutable SHA-256-pinned game modules;
- sandboxed browser game frames;
- a dedicated worker for each active room/version;
- private template entitlements with short-lived signed Blob downloads;
- no committed production credentials.

Game server bundles are **trusted publisher code**. Worker threads provide runtime isolation and lifecycle containment, but they are not a hostile-code sandbox. Untrusted third-party server modules require a stronger container/microVM boundary.

See [docs/security.md](docs/security.md) and [SECURITY.md](SECURITY.md).

## Emulator foundation

`packages/emulator-sdk` provides a future boundary for browser/server emulator adapters, controller mapping, capability detection, save states, and lawful game-image metadata.

The repository intentionally ships **no ROMs, BIOS/firmware, copyrighted game images, or emulator cores**. PS1/PS2 compatibility must be evaluated per core, browser, device, and legally supplied game image.

See [docs/emulator-roadmap.md](docs/emulator-roadmap.md).

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), follow the [Code of Conduct](CODE_OF_CONDUCT.md), and keep game/platform boundaries intact.

For vulnerabilities, follow [SECURITY.md](SECURITY.md) rather than opening a public issue.

## License

[MIT](LICENSE) © 2026 rahmanef63
