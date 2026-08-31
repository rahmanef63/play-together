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

Managed Vercel uses a Redis room bus between WebSocket Function replicas. A connection lease registry provides global presence, validated controller input is fanned to each deterministic room replica, and a deterministic authority election selects the one display/handheld replica allowed to publish snapshots. This keeps cross-instance transport transient while Convex remains durable SSOT.

The gateway stores no durable product record. It:

- validates the exact browser origin;
- accepts tickets through the WebSocket subprotocol rather than query logs;
- checks ticket HMAC, audience, issuer, expiry, and one-time replay ID;
- verifies the requested manifest and server entry digest;
- starts one worker for the room's exact release;
- validates and rate-limits client messages;
- advances the authoritative game clock and broadcasts snapshots;
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

A browser game slice may bundle its own third-party renderer (for example Three.js) when the dependency is declared in that game package. The platform does not import that renderer, and server authority must never depend on it. This keeps richer 3D cartridges isolated: renderer upgrades change only that game's next immutable release.

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

## Vertical slices

### Identity

`apps/web/features/auth` → `convex/auth` → Convex Auth tables.

### Game publication

`games/<id>/game.config.json` → discovery/registry generator → shared build script → immutable manifest/CDN files → `convex/games` registry. Each game folder is one vertical slice and the portal derives discovery metadata from the generated registry rather than a hardcoded list.

### Room admission

Lobby/room UI → `convex/rooms` transactional capacity + password verification → membership.

### Connection

Launch UI → `convex/tickets` → HMAC ticket → gateway verification and replay guard.

### Realtime play

Manifest-declared console → validated input protocol → room worker → validated snapshot protocol → display module. In handheld mode the browser runtime mounts the pinned display plus generated controls over the same realtime context; in shared-screen mode the display and phone console are separate surfaces of the same room. Legacy/custom controller bundles remain an optional manifest entry.

### Operations

`apps/web/features/ops`, health endpoints, local bootstrap, Compose, CI, and security checks.

## Version isolation

A room copies release identity at creation. Ticket claims repeat that identity, and the gateway derives its worker key from:

```text
roomId + gameId + gameVersion + manifestSha256
```

Publishing `game-c@2.0.0` cannot alter `game-c@1.0.0`, a room using `1.0.0`, or any other game. Rollback means selecting an already-published immutable version for new rooms; it never rewrites history.

## Scaling path

- Scale the web shell and game CDN horizontally behind normal HTTP caching.
- Keep Convex for durable state and avoid frame-rate writes.
- Shard realtime gateways by region and use room affinity.
- Route one room to one authoritative gateway at a time.
- Add a shared replay store only when gateways span processes/regions; the in-memory replay guard protects one instance.
- For edge deployment, preserve the transport/worker contracts rather than changing game APIs.


## Local issuer discovery

Self-hosted Convex verifies the configured auth issuer by fetching its OpenID metadata. In local Compose, `convex-site.localhost` resolves to `::1` inside the backend container while the site API listens on `3211`. The development-only `convex-site-loopback` service shares the backend network namespace and forwards `[::1]:43211` to `127.0.0.1:3211`. Its readiness check validates upstream reachability without requiring auth routes to exist before the first Convex deployment. It carries real discovery/JWKS traffic; it is not a compatibility placeholder and is absent from production topology.
