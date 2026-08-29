# Game SDK and release contract

## Required files

```text
games/<game-id>/
  game.config.json
  package.json
  tsconfig.json
  src/controller.ts
  src/display.ts
  src/server.ts
  src/*.test.ts
```

`game.config.json` declares identity, version, player limits, tick/snapshot rates, supported modes, preferred orientation, and hardware capabilities.

## Server module

Export `createServerGame(context)`. The returned game implements:

- `onJoin(player)`
- `onLeave(playerId)`
- `onInput(playerId, payload, sequence)`
- `tick(nowMs, deltaMs)`
- `snapshot()`
- optional `dispose()`

Rules:

- Treat every input payload as untrusted.
- Ignore or reject malformed input without crashing the worker.
- Enforce game-specific player limits in addition to room capacity.
- Use the provided deterministic seed for randomness that must match replays.
- Do not access Convex, platform internals, environment secrets, filesystem paths, or another game.
- Keep snapshots serializable and bounded.

## Browser modules

Export `mountController(root, context)` and `mountDisplay(root, context)`.

The controller module always owns game-specific input controls. The display module always owns the game view. The platform composes them differently by mode:

- `remote`: controller module on the phone while the paired shared browser/TV runs the display module;
- `handheld`: display and controller modules from the same pinned release are mounted together inside one console shell and share one realtime context;
- adaptive handheld orientation: portrait stacks screen over controls, while landscape places them side by side in a PSP-style shell.

The platform owns only the brand-neutral console chassis. A game may optionally declare `controller.shellPreset` as `classic`, `racing`, or `flight`; this changes the outer mobile shell without changing game input code. Remote shells never create a game-screen element. Existing immutable manifests that predate `shellPreset` remain valid and receive a deterministic fallback based on verified game metadata.

Neither browser module should simulate authoritative outcomes locally. The room worker remains the source of truth. Browser-only rendering/animation dependencies are allowed inside a game package when they stay behind the display/controller boundary; do not move a concrete renderer into platform shared packages just to deduplicate it.

The context exposes only:

- `playerId`
- `mode`
- `sendInput(payload)`
- `subscribe(snapshotListener)`
- `getLatestSnapshot()`
- `setStatus(message)`

Return a cleanup function that removes listeners and DOM state.

## Build and integrity

The shared build script bundles browser and server entries independently, hashes all three, and emits a manifest. Do not add a game-specific copy of the build script.

```bash
pnpm game:publish:one tap-race
```

The publisher refuses to replace an existing version with different bytes. To change code, bump the version.

Register only after uploading the exact bytes:

```bash
pnpm game:publish:convex:one tap-race
```

## Compatibility change

- Patch/minor game behavior: bump game version; keep protocol version when schemas remain compatible.
- Wire schema change: add a new protocol version in `packages/contracts`; support it explicitly in the platform before publishing the game.
- SDK breaking change: version the SDK contract; do not leave a compatibility re-export file.

## Review checklist

- Distinct controller/display is supplied; no placeholder platform console.
- Shared-screen + remote and handheld behavior matches manifest declarations.
- Portrait/landscape behavior is tested when adaptive orientation is declared.
- Invalid payload, duplicate sequence, disconnect, and max-player behavior are tested.
- Snapshot and module sizes are bounded.
- Game imports pass `pnpm architecture:check`.
- Release digests pass the root integrity test.
