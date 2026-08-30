# Changelog

All notable changes to Play Together are documented here. The project follows semantic versioning for the platform and immutable semantic versions for each game release.

## [Unreleased]


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
