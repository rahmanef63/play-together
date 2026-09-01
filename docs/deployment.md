# Deployment

## Managed production target

The primary production target is **Vercel + Convex Cloud**. The VPS/Dokploy Compose stack remains useful for local development and rollback during migration, but it is not required by the managed runtime.

| Surface | Managed service | Release boundary |
|---|---|---|
| Web shell / PWA | Vercel static output | platform UI changes |
| Realtime gateway | Vercel WebSocket Function | gateway/protocol changes |
| Immutable game releases | Vercel CDN static output | game release changes |
| Auth / rooms / catalog / entitlements | Convex Cloud | schema/function changes |
| Paid template source | Vercel Private Blob | template-source releases |
| Cross-instance room coordination | Vercel Redis (`sin1`) | required for managed realtime |

A game release remains immutable and version-pinned. Updating `game-a@2.0.0` never replaces `game-a@1.0.0`, and active rooms retain their stored manifest digest.

## Production URLs

The canonical player URL is:

```text
https://game.rahmanef.com
```

The managed build defaults realtime to the same origin:

```text
wss://game.rahmanef.com/api/realtime
```

Convex uses its managed `*.convex.cloud` and `*.convex.site` endpoints. These values are supplied through deployment environment variables rather than custom VPS subdomains.

## Vercel build

`vercel.json` owns the managed runtime contract. The build command is:

```bash
pnpm vercel:build
```

It:

1. verifies/publishes the tracked immutable game releases;
2. builds the realtime gateway and its room worker;
3. builds the Vite web shell;
4. copies immutable release artifacts under `apps/web/dist/games` for Vercel CDN delivery.

The realtime Function uses the standard Node HTTP/WebSocket server boundary and a 300-second duration compatible with the current Hobby deployment. The browser runtime already refreshes its short-lived room ticket and reconnects transparently when a Function lifetime or deployment causes a reconnect.

### Horizontal realtime scale

Vercel may place separate WebSocket connections for one room on different Function instances. Managed production therefore **requires Redis coordination**; a local-only in-memory room is supported only for development and single-process tests.

The distributed path is intentionally transient:

- Convex remains the durable control plane for users, rooms, membership, play state, tickets, and immutable game metadata.
- Redis stores short-lived connection leases and carries validated room presence, controller input, and authority snapshots between Function replicas. It also holds a transient set of exact blocked-release identities and a release-control Pub/Sub channel so emergency policy propagates to already-live sessions; Convex/catalog policy remains durable SSOT.
- Every replica runs the same deterministic server game worker, but authority election prefers a display/handheld replica and only that replica publishes snapshots. Other replicas consume that snapshot stream for their locally connected sockets.
- Browser heartbeats refresh Redis connection leases. Stale entries expire automatically and coordinator failure is fatal to the affected room instead of silently falling back to divergent local state.

Production requirements:

```text
REDIS_URL=<injected by the connected Vercel Redis resource>
```

The Vercel Function forces `REQUIRE_DISTRIBUTED_COORDINATION=true`. CI checks for `REDIS_URL` before building the production artifact and then waits until `/api/realtime` reports `coordination: "distributed"`, `releaseControl: "ready"`, and observability schema v1 before game registration and browser E2E. Managed registration sets `RELEASE_CONTROL_REQUIRED=true`, so a durable Convex policy update is not considered fully deployed unless its Redis blocked-set mirror/Pub/Sub control path can also be reconciled.

Recommended Vercel Marketplace resource for this deployment: Redis Free, region `sin1`, RAM only. Marketplace terms must be accepted by the account owner.

## Convex Cloud

Production and development use separate Convex deployments. Never make production the implicit CLI target. Production operations should use an explicit deploy key or `--prod` option.

Required Convex environment categories:

```text
SITE_URL=https://game.rahmanef.com
JWT_PRIVATE_KEY=<secret>
JWKS=<secret/public-key-set JSON>
JOIN_TICKET_SECRET=<same value as Vercel realtime>
GAME_PUBLISH_TOKEN=<release-only secret>
GAME_MODULE_ORIGINS=https://game.rahmanef.com
ALLOW_INSECURE_GAME_ORIGINS=false

RESEND_API_KEY=<server-only Resend key>
EMAIL_FROM_ADDRESS=official@rahmanef.com
EMAIL_PROJECT_NAME=Play Together
EMAIL_PROJECT_TAG=play-together

TEMPLATE_DOWNLOAD_SECRET=<same value as Vercel download function>
TEMPLATE_PUBLISH_TOKEN=<release-only secret>
TEMPLATE_SALES_WEBHOOK_SECRET=<checkout fulfillment HMAC secret>
```

`RESEND_API_KEY` is consumed only by Convex server actions. It must never be exposed as a Vite variable or shipped to Vercel browser output.

## Vercel environment

At minimum:

```text
VITE_CONVEX_URL=<production Convex Cloud URL>
JOIN_TICKET_SECRET=<same value as Convex>
ALLOWED_ORIGINS=https://game.rahmanef.com
GAME_MODULE_ORIGINS=https://game.rahmanef.com
ALLOW_INSECURE_GAME_ORIGINS=false
TEMPLATE_DOWNLOAD_SECRET=<same value as Convex>
```

The connected private Blob store supplies `BLOB_READ_WRITE_TOKEN` to the server runtime. Never expose it through a `VITE_` variable.

## Password-reset email

Password reset uses one verified sender identity:

```text
Play Together <official@rahmanef.com>
```

The display name and Resend `project` tag are dynamic environment values. Reset requests are enumeration-safe, rate-limited, and send an 8-digit code that expires after 10 minutes. A reset invalidates the user's other sessions through Convex Auth.

## Paid template source

Public game cartridges in this repository are MIT-licensed and are not repackaged as private paid source. Commercial template source lives outside Git in:

```text
template-sources/<slug>/template.json
template-sources/<slug>/source/
```

`template-sources/` and generated packages are gitignored. Build/upload with:

```bash
pnpm template:pack <slug> --upload
pnpm template:publish .local/template-packages/<slug>-<version>.json
```

The packer rejects common secret/key files, symlinks, `.env`, `.git`, `node_modules`, private-key material, and obvious API-key patterns before creating a private archive.

A published catalog record contains only commercial metadata plus the private Blob pathname/digest on the server. Users receive a two-minute entitlement ticket; the Vercel endpoint exchanges it for an exact-path, short-lived presigned Blob GET URL. Large archives therefore download directly from Blob instead of crossing the Vercel Function response-size limit.

Checkout is provider-agnostic. A payment system can POST a signed fulfillment event to Convex HTTP `/api/templates/fulfill-purchase`; the HMAC header is `x-play-together-signature`. Duplicate `orderRef` values are idempotent. Purchases made before account creation remain pending and are claimed automatically when a matching authenticated email opens Templates.

## Release order

1. Run `pnpm verify` and `pnpm vercel:build` locally.
2. Deploy backward-compatible Convex schema/functions to the target Cloud deployment.
3. Deploy a Vercel preview with production-like non-secret routing values.
4. Verify health, auth, room creation, WebSocket play, game manifest integrity, and template UI.
5. Register immutable game manifests against the Vercel game origin.
6. Run browser E2E against the preview.
7. Move the canonical domain only after preview verification.
8. Run production E2E and health checks again.
9. Remove the legacy VPS routes only after a rollback window.

## Local development / legacy rollback

The Docker Compose stack is retained for deterministic local E2E and as a migration rollback reference:

```bash
pnpm stack:bootstrap
pnpm stack:config
pnpm stack:down
```

Do not use `docker compose down -v` unless you intentionally want to delete local durable Convex data.

## Rollback

- **Web/realtime:** redeploy a known Vercel Git SHA.
- **Game:** select an already-published immutable game version; never overwrite release bytes.
- **Convex:** use widen-migrate-narrow schema changes and deploy backward-compatible functions first.
- **Domain migration:** keep the former deployment reachable until the managed production smoke/E2E window is complete.
