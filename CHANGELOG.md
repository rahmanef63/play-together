# Changelog

All notable changes to Play Together are documented here. The project follows semantic versioning for the platform and immutable semantic versions for each game release.

## [Unreleased]

## [0.11.1] - 2026-08-31

### Fixed

- Reworked phone remotes into bounded, safe-area-aware controller layouts for both portrait and landscape, including compact racing pedals/actions and no clipped `BOOST` control or forced rotate overlay.
- Pre-game hosts now always receive a scannable room QR (compact on phone, full-size on display) before `Start Game`, with a visible room-code fallback if QR generation fails.
- Turbo Circuit `0.3.0` improves steering deadzone/smoothing, high-speed steering authority, off-track and collision recovery, camera look-ahead, and adds a more readable circuit environment with curbs, start grid, stands, trees, billboards, minimap, and wrong-way feedback.
- Added distributed Vercel room coordination so display and controller WebSockets that land on different Function instances still share one global controller presence, validated input stream, and authority snapshot stream.
- Added deterministic room-replica authority election: shared displays/handheld replicas are preferred over remote-only replicas, and only the elected replica publishes gameplay snapshots.
- Managed Vercel realtime now fails fast without `REDIS_URL`; CI also verifies `coordination: distributed` before production browser tests, preventing local-only room state from being silently deployed.

### Infrastructure

- Added a Redis pub/sub + presence lease adapter with 45-second stale-connection expiry, bounded 256 KiB room events, and explicit coordinator failure containment.
- Added cross-instance coordinator tests and a two-replica RoomSession regression proving a controller input received by replica B updates the authoritative display snapshot on replica A.

## [0.11.0] - 2026-08-31

### Added

- A real **scan-to-join** Remote lobby: TV/laptop displays render an on-device QR code for the exact room, public rooms auto-join after scanning, password rooms keep their password gate, and scanned phones continue directly into the Remote controller flow.
- Authoritative room lifecycle state (`lobby` → `playing`) with host-only **Start Game** and **Menu** transitions. Realtime tickets are refused while a room is still in the lobby, so games do not run behind the menu.
- Pre-game setup UI for every play surface with game, mode, player count, version, QR/invite state, and host-controlled Start.
- Direction regressions for Turbo Circuit, Sky Strike, and Flight Trainer that verify left input actually turns to local vehicle/aircraft left.

### Changed

- Remote controller shells are bounded to handset-safe dimensions instead of stretching edge-to-edge on landscape phones; racing/flight layouts no longer depend on desktop minimum column widths.
- Built-in face controls read the optional manifest `displayLabel` (for example **BOOST**, **CANNON**, **MISSILE**, **FLAPS**, or **GEAR**) while `face` remains the physical A/B/X/Y placement. No game-name/action mapping is hardcoded in the renderer.
- Live display status now reports connected controllers; “scan” is reserved for the QR join action.

### Fixed

- Corrected reversed steering/yaw conventions in Turbo Circuit, Sky Strike, and Flight Trainer, including AI steering compensation where required.
- Replaced 20 Hz transform snapping in the three 3D displays with frame-time pose interpolation, angle-aware rotation smoothing, and damped camera targets to remove visible vehicle/aircraft camera jitter.
- Preserved immutable `0.2.2` intermediate releases and published final `0.2.3` releases for Turbo Circuit, Sky Strike, and Flight Trainer after moving semantic controller labels into cartridge SSOT; all earlier releases remain unchanged.

## [0.10.0] - 2026-08-31

### Added

- One adaptive **Remote** launch flow: phone-sized devices become controllers, desktop/TV-sized devices become display hubs, with explicit role switching available only as a fallback.
- Authoritative realtime presence now carries controller mode, allowing the display hub to discover unique connected remote players without browser LAN/device APIs or polling room membership.
- Host-side `presentation.remoteDisplay` policy with `shared` and `per-player` strategies plus a four-viewport cap; Turbo Circuit, Sky Strike, and Flight Trainer opt into per-player camera views while communal games remain shared.
- Multi-viewport display composition inside one sandboxed game frame: one verified display-module import and one realtime connection fan snapshots out to 1–4 player-focused views.
- Unit and browser coverage for device-role inference, remote deduplication, shared-vs-split policy, and live 1 → 2 → 1 viewport transitions as remotes join and leave.

### Changed

- Removed popup-based shared-display launch. Both TV/laptop and phone select the same `Remote` action; the display automatically scans connected remotes and chooses shared or split presentation.
- Game CRUD/MCP tools expose remote display policy as host metadata. Presentation-only changes do not require a cartridge version bump; any cartridge byte change remains immutable and requires a greater semantic version.
- Game publication explicitly strips host-only presentation metadata before hashing the cartridge manifest, preserving every existing immutable release digest.

## [0.9.0] - 2026-08-31

### Added

- Native-feeling mobile PWA navigation with a safe-area-aware five-item dock, full-width snap cards, horizontal game/template/launch rails, and standalone manifest shortcuts.
- Skeleton loading states, route-level lazy loading, async image decoding, and content-visibility hints for offscreen cards.
- Version-stamped service-worker update flow with an in-app reload toast that clears only Play Together caches/version cookies while preserving authentication sessions.
- Frontend `/developers` submission kit with repository-backed docs, MCP/tool reference, and one-click copy of the canonical full game prompt through validation and CI publish.
- Project-owned stdio MCP server and MSO fixed-argv functions for game list/get/create/update/delete/validate/local-publish/registry/prompt operations.
- Game tool regression coverage for immutable update/delete guards, MCP protocol parity, and generated PWA/docs artifacts.

### Changed

- Mobile lobby uses full-viewport horizontal snap panels instead of vertically compressing Create and Room containers.
- Mobile Templates, room launch modes, and submission rules use touch-first horizontal card rails with native scrollbars hidden.
- Game CRUD tooling keeps production deployment credentials out of the tool process and leaves production registration to verified main-branch CI.

### Security

- Published game versions cannot be modified by `game_update` without an explicit greater semantic version, and any game with release history is protected from `game_delete`.
- PWA cache refresh never clears Convex authentication storage or unrelated site cookies.

## [0.8.0] - 2026-08-30

### Added

- Full room directory CRUD for hosts: list owned rooms, edit room name/visibility/capacity/password policy, and delete rooms without changing their pinned game version.
- Application-owned scroll areas with hidden native scrollbars and custom scroll indicators for lobby and room containers.
- `docs/submitting-games.md` with the complete game submission contract and a reusable base prompt for AI coding agents.

### Fixed

- Game surfaces now occupy the full viewport while the play toolbar overlays the game instead of consuming layout height.
- Stabilized mobile viewport sizing to avoid dynamic browser-chrome height feedback during play.
- Canvas and Three.js cartridges resize their drawing buffers only when dimensions change instead of every animation frame, eliminating a major source of visible shake/flicker and unnecessary GPU work.


## [0.7.0] - 2026-08-30

### Added

- Manifest-native dynamic console topology for every active game: analog sticks, D-pads, A/B/X/Y face buttons, shoulders/triggers, racing/flight layouts, and touch surfaces are declared inside each game slice.
- Generated `game-registry.json` as the portal discovery SSOT, derived from `games/*/game.config.json`.
- Built-in mobile controller renderer shared by remote and handheld modes, with no game-name heuristics.
- Architecture guards requiring package/config version parity, unique control IDs, and exactly one controller source of truth.

### Changed

- Removed all 15 duplicated `src/controller.ts` implementations; standard controllers are generated from immutable manifest metadata.
- `entries.controller` is now optional for backward-compatible custom/legacy releases.
- Published a new immutable version for all 15 active cartridges so rooms pin the exact new controller topology.


## [0.6.0] - 2026-08-30

### Added

- Managed-first Vercel + Convex Cloud production topology with same-origin WebSocket Functions and immutable game CDN output.
- Convex Auth password-reset flow with enumeration-safe requests, rate limiting, 8-digit expiring codes, session invalidation, and dynamic Resend project metadata from `official@rahmanef.com`.
- Provider-agnostic commercial template marketplace with private source packaging, purchase entitlements, signed fulfillment webhook, and short-lived Vercel Private Blob downloads.
- Managed CI/CD job that deploys Convex Cloud and an exact Vercel production artifact only after repository verification and integration tests pass, then runs production browser E2E.
- Regression coverage for managed runtime configuration, email payloads/password policy, signed template tickets, and private template package safety.

### Changed

- Migrated the production control-plane dataset to Convex Cloud while preserving existing password-account hashes and invalidating legacy session tokens at the managed boundary.
- Realtime deployment now supports Vercel Function routing, 300-second lifecycle/reconnect behavior, `sin1` function placement, deployment-origin allowlisting, and managed health metadata.
- Browser build endpoint variables now participate in Turborepo cache hashes to prevent stale self-hosted/Cloud bundles from sharing build cache entries.
- Managed production is the primary documented deployment model; Docker/Dokploy remains a local development and temporary rollback path only.

### Security

- Paid template source is kept outside public Git, rejects secret/build/cache artifacts and symlinks during packaging, and can only be fetched through entitlement-scoped signed URLs.
- Password reset UI disables delivery when the server has no actual Resend credential instead of reporting a false success.


## [0.5.0] - 2026-08-30

### Changed

- Replaced the generic controller frame with a dark mobile-first console shell inspired by dedicated handheld hardware, without product-specific branding.
- Added dynamic `classic`, `racing`, and `flight` screenless landscape remote presets; cartridges may opt in explicitly and existing releases fall back to manifest-content inference.
- Handheld mode now uses the same modular shell system with safe-area, portrait and landscape layouts.
- Added slow-client snapshot backpressure, worker startup timeout protection, and repeated tick-failure containment in the realtime runtime.
- Added a sustained latest-cartridge stability audit covering every active game server.

## [0.4.0] - 2026-08-29

### Added

- **Turbo Circuit**, a Three.js/WebGL 3D arcade racer with server-authoritative steering, throttle, braking, nitro, off-track friction, vehicle collision, sequential checkpoints, three-lap races, and AI rivals.
- **Sky Strike**, a Three.js/WebGL fighter dogfight with bank/pitch/yaw flight, throttle, cannon projectiles, homing missiles, target lock, health, kills, respawns, round wins, and AI bandits.
- **Flight Trainer**, a Three.js/WebGL training simulator with yoke, yaw, throttle, flaps, landing gear, airspeed/altitude/VSI/heading instruments, takeoff route rings, simplified lift/stall physics, crash detection, and safe-landing conditions.
- Dedicated server tests and browser gameplay coverage for the three advanced 3D cartridges.
- Immutable `0.1.1` release candidates for the three 3D games after final lint cleanup; the initially generated `0.1.0` bytes remain preserved as history.

### Changed

- Active game catalog grows from 12 to 15 independent vertical slices while preserving all prior immutable releases.
- Platform package version advances to `0.4.0`; existing game versions remain untouched.

## [0.3.0] - 2026-08-29

### Added

- A true handheld runtime that mounts each pinned game release's live display and controller together over one authoritative realtime connection.
- Game Boy-style portrait and PSP-style landscape console composition for every handheld-capable cartridge.
- Real gameplay preview thumbnails for all 12 active games, captured from the running handheld integration stack and shown in the lobby game picker.
- A reproducible `scripts/capture-game-previews.mjs` workflow for refreshing preview media from real gameplay.

### Changed

- Unified the old separate Shared Display and Remote Only launch choices into one **Shared screen + remote** flow.
- Published new immutable cartridge versions for the playable-runtime rollout: Pong `0.3.0`, Tap Race `0.3.0`, and `0.2.0` for the other ten active games.
- Pong and Tap Race controllers now render controls only; handheld display composition is owned centrally by the browser runtime instead of duplicated per game.

## [0.2.0] - 2026-08-29

### Added

- Ten additional independent multiplayer cartridges: Reaction Rush, Memory Lights, Snake Arena, Dodge Dash, Target Blast, Tug War, Rhythm Pulse, Maze Run, Stack Tower, and Orbit Dodge.
- Browser matrix coverage that loads both the shared-display and handheld controller bundle for every new game while keeping the production room-creation rate limit enabled.

## [0.1.0] - 2026-08-29

### Added

- Convex-backed authentication, game catalog, rooms, memberships, public available-slot discovery, optional room passwords, and transactional capacity.
- Authoritative WebSocket realtime gateway with signed tickets, replay protection, validated/rate-limited input, snapshots, and one game worker per room/version.
- Immutable SHA-256-pinned game release archive and CDN.
- Sandboxed browser runtime with handheld, remote-only, and shared-display modes.
- Independent Pong and Tap Race reference games.
- Emulator adapter boundary for future lawful PS1/PS2/custom WASM integrations.
- Full unit, architecture, security, smoke, and browser E2E verification pipeline.
- Production reference topology at `game.rahmanef.com` with real gameplay screenshots and an animated desktop/mobile controller demo.
- Open-source community files, issue forms, pull-request template, and MIT license.
- Reproducible clean Convex bootstrap and configurable external production network support for Dokploy.
- Production-configurable E2E realtime health endpoint.
