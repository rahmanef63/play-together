# Changelog

All notable changes to Play Together are documented here. The project follows semantic versioning for the platform and immutable semantic versions for each game release.

## [Unreleased]

### Added

- Production reference topology at `game.rahmanef.com`.
- Real gameplay screenshots and an animated desktop/mobile controller demo.
- Open-source community files, issue forms, pull-request template, and MIT license.

## [0.1.0] - 2026-08-29

### Added

- Convex-backed authentication, game catalog, rooms, memberships, public available-slot discovery, optional room passwords, and transactional capacity.
- Authoritative WebSocket realtime gateway with signed tickets, replay protection, validated/rate-limited input, snapshots, and one game worker per room/version.
- Immutable SHA-256-pinned game release archive and CDN.
- Sandboxed browser runtime with handheld, remote-only, and shared-display modes.
- Independent Pong and Tap Race reference games.
- Emulator adapter boundary for future lawful PS1/PS2/custom WASM integrations.
- Full unit, architecture, security, smoke, and browser E2E verification pipeline.
