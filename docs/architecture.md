# Architecture

## Design goal

The platform must support many games and device layouts while keeping failures, builds, and releases isolated. The core invariant is:

> The platform knows how to launch a game contract; it does not know how a concrete game works.

## Runtime planes

### Durable control plane — Convex

Convex stores:

- users and password-auth sessions;
- published game metadata and immutable manifest references;
- rooms, public/private visibility, optional password hashes, capacity, and status;
- active room memberships and heartbeats;
- rate-limit records for durable mutations;
- short-lived connection-ticket issuance.

Capacity admission happens in one Convex mutation, so concurrent join attempts observe a single serialized room state. A public room is listed only while open and before its active membership count reaches capacity. Private rooms are addressable by code but absent from public discovery.

### Transient realtime plane — WebSocket gateway

Managed Vercel uses Redis between WebSocket Function replicas. A connection lease registry provides global presence, validated controller input is fanned to each deterministic room replica, and deterministic authority election selects the one display/handheld replica allowed to publish snapshots. A separate Redis blocked-release set plus Pub/Sub channel mirrors only emergency release policy so active instances can revoke exact releases immediately and cold-start instances hydrate the current blocked set. Convex/catalog policy remains the durable SSOT.

The gateway stores no durable product record. It:

- validates the exact browser origin;
- accepts tickets through the WebSocket subprotocol rather than query logs;
- checks ticket HMAC, audience, issuer, expiry, and one-time replay ID;
- verifies the requested manifest and server entry digest;
- starts one worker for the room's exact release;
- validates and rate-limits client messages;
- advances the authoritative game clock and broadcasts snapshots;
- hydrates/subscribes to emergency blocked-release control before accepting realtime connections;
- records bounded aggregate worker/browser/revocation telemetry without room/player identifiers;
- expires idle rooms and connection tickets.

If the gateway restarts, rooms reconnect with fresh tickets while durable lobby data remains in Convex.

### Immutable game plane — Game CDN

The tracked immutable release archive (and production CDN/object store) contains:

```text
games/<game-id>/<version>/
  manifest.json
  display.js
  server.js
  controller.js   # optional, custom-controller releases only
```

Every executable entry has a SHA-256 digest in `manifest.json`. The catalog stores a digest for the manifest itself. Publishing the same `<game-id>/<version>` with different bytes is rejected.

## Browser isolation

The shell verifies the manifest and browser bundle bytes before import. It mounts the game in a sandboxed same-origin iframe that has no parent-DOM access. The frame receives only:

- its player ID and selected mode;
- a validated snapshot subscription;
- a validated input sender;
- a bounded status callback.

The game does not receive Convex credentials, room password, publish token, or raw ticket secret.

Browser game modules may declare engine-provided browser dependencies through `runtimeDependencies`. The engine resolves only explicitly supported ABI surfaces, SHA-verifies their bytes, and imports them inside the sandbox as verified Blob modules. Current 3D games share `three@0.185.1+pt1`; `+pt1` is a fixed Play Together export surface, not a floating npm alias. If a future game needs another Three export, create `+pt2` rather than changing the bytes behind `+pt1`. Server authority never depends on browser renderer vendors.

## Server isolation

Each room and pinned release runs in its own Node.js worker thread with bounded heap/stack settings. A worker crash closes only that room session. This protects availability between normal trusted game releases, but worker threads share the host process permissions. Third-party untrusted server modules require a separate process/container or microVM policy before publication.

## Dependency direction and ownership

The repository follows vertical ownership with thin composition boundaries:

```text
app composition → feature slice → shared contracts/runtime boundaries
                         ↓
                    Convex facade → private domain modules
                         ↓
             realtime session orchestrator → worker/client/distribution owners

games/<id> → game SDK/contracts only
```

`apps/web/src/features/<slice>` owns its page, model/hooks, components, and styles. A feature must not import a sibling feature's internals. `shared` contains only true cross-feature primitives; `frame` contains sandbox/controller/display runtime and must remain feature-agnostic. Public Convex files preserve API paths but delegate to private domain modules. Realtime session components own state instead of accumulating helper methods on one class.

Maintained implementation files have a 200-line budget enforced by `scripts/check-boundaries.mjs`. The budget is a cohesion guard, not a request for arbitrary file splitting: extract an independently nameable concern and keep its state with its owner. Generated artifacts, immutable release archives, lockfiles, and narrative history are not architecture units.

Visual SSOT follows the same ownership: app tokens live under `apps/web/src/styles`, game-frame tokens under `apps/web/src/frame/styles`, feature rules are colocated, and legacy compatibility overrides are isolated explicitly.

## Runtime metadata SSOT

Runtime metadata has three owners and must not be duplicated:

1. **Convex published catalog** — playable release identity plus mutable host policy: presentation and release state. `active` is selectable, `retired` is excluded from new rooms while existing pinned rooms remain valid, and `blocked` immediately revokes already-live exact-release sessions and denies new ticket issuance/reconnects. Redis mirrors only blocked identities for transient cross-instance delivery; it is not an additional policy SSOT. Rooms copy immutable identity/presentation when created.
2. **Immutable game manifest** — controller definition, capabilities, module/assets digests, and declared browser runtime dependencies.
3. **Engine runtime** — generic manifest interpreter, sandbox, verified loader, and reusable shell presets. It must not branch on game IDs, control IDs, or mechanic labels.

`apps/web/public/game-registry.json` is a generated tooling/developer snapshot only. Lobby/play runtime must use Convex plus the SHA-pinned manifest, so a stale static registry cannot change live behavior. Engine resources and cartridge resources use immutable HTTP caching but are still SHA-verified before execution.

## Vertical slices

### Identity

`apps/web/features/auth` → `convex/auth` → Convex Auth tables.

### Game publication

`games/<id>/game.config.json` → discovery → shared build script → immutable manifest/CDN files → `convex/games` catalog. Each game folder is one vertical slice. The generated static registry is for tooling/previews; user-facing runtime discovery comes from Convex and each selected manifest is SHA-verified.

### Room admission

Lobby/room UI → `convex/rooms` transactional capacity + password verification → membership.

### Connection

Launch UI → `convex/tickets` → HMAC ticket → gateway verification and replay guard.

### Realtime play

Manifest-declared console → validated input protocol → room worker → validated snapshot protocol → display module. In handheld mode the browser runtime mounts the pinned display plus generated controls over the same realtime context; in shared-screen mode the display and phone console are separate surfaces of the same room. Legacy/custom controller bundles remain an optional manifest entry.

### Operations

`apps/web/features/ops`, health endpoints, local bootstrap, Compose, CI, and security checks. `/ops` polls the realtime health surface only while open and labels performance data as an **instance sample**, not a cluster-global aggregate. Realtime also emits a structured `realtime_metrics` event every 30 seconds while at least one room is active plus `release_blocked_live` when an emergency block actually disconnects live sessions. Metric payloads use fixed histograms/counters and omit player IDs, room IDs, and game IDs.


## Version isolation

A room copies release identity at creation. Ticket claims repeat that identity, and the gateway derives its worker key from:

```text
roomId + gameId + gameVersion + manifestSha256
```

Publishing `game-c@2.0.0` cannot alter `game-c@1.0.0`, a room using `1.0.0`, or any other game. Rollback means selecting an already-published immutable version for new rooms; it never rewrites history. Retirement changes host eligibility only. Blocking is reserved for incidents where even already-pinned connections must stop: each realtime instance closes only sessions whose `gameId + gameVersion + manifestSha256` exactly matches the blocked identity, while unrelated releases continue.

## Scaling path

- Scale the web shell and game CDN horizontally behind normal HTTP caching.
- Keep Convex for durable state and avoid frame-rate writes.
- Shard realtime gateways by region and use room affinity.
- Route one room to one authoritative gateway at a time.
- Add a shared replay store only when gateways span processes/regions; the in-memory replay guard protects one instance.
- For edge deployment, preserve the transport/worker contracts rather than changing game APIs.


## Local issuer discovery

Self-hosted Convex verifies the configured auth issuer by fetching its OpenID metadata. In local Compose, `convex-site.localhost` resolves to `::1` inside the backend container while the site API listens on `3211`. The development-only `convex-site-loopback` service shares the backend network namespace and forwards `[::1]:43211` to `127.0.0.1:3211`. Its readiness check validates upstream reachability without requiring auth routes to exist before the first Convex deployment. It carries real discovery/JWKS traffic; it is not a compatibility placeholder and is absent from production topology.
