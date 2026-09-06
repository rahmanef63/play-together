# Deployment

## Managed production target

The primary production target is **VPS/Dokploy + Convex Cloud**. `game.rahmanef.com` is served by the VPS through the existing Dokploy Traefik edge. Vercel no longer builds or runs the web/realtime application on every `main` push; its application deployment is retained only as a rollback target during the migration window.

| Surface | Production service | Release boundary |
|---|---|---|
| Web shell / PWA | VPS `web` container behind Dokploy Traefik | platform UI changes |
| Realtime gateway | VPS `realtime` container behind the same host at `/api/realtime` | gateway/protocol changes |
| Immutable game releases | VPS `web` container under `/games/<id>/<version>/...` | game release changes |
| Auth / rooms / catalog / entitlements | Convex Cloud | schema/function changes |
| Paid template source | Existing private Vercel Blob store, accessed from VPS | template-source releases |
| Realtime coordination / release control | Existing managed Redis, accessed from VPS | transient coordination only |

The Redis and private Blob services are deliberately retained as external dependencies for the first compute cutover. They do not run the Play Together frontend or WebSocket compute. Migrating those state/storage services is a separate follow-up so the web/realtime move does not also change release-control and paid-download semantics.

A game release remains immutable and version-pinned. Updating `game-a@2.0.0` never replaces `game-a@1.0.0`, and active rooms retain their stored manifest digest.

## Production URLs

The canonical player URL remains:

```text
https://game.rahmanef.com
```

Realtime remains same-origin:

```text
wss://game.rahmanef.com/api/realtime
```

Convex continues to use its managed `*.convex.cloud` and `*.convex.site` endpoints. Moving application compute to the VPS does not move or reset the production Convex deployment.

## Environment contract

Environment ownership is generated from one source of truth: `scripts/environment-manifest.mjs`, composed from the bounded group files under `scripts/environment/`. Run:

```bash
pnpm env:examples
```

It generates:

- `.env.all.example` — every project-consumed environment contract, including platform-injected informational values;
- `.env.example` — local/runtime/tooling values with safe defaults or placeholders;
- `.env.production.example` — aggregate production/CI reference;
- `.env.vps.production.example` — exact primary VPS runtime profile;
- `.env.vercel.production.example` — legacy Vercel rollback profile;
- `docs/environment.md` — generated variable scope, secret classification, source, and purpose table.

The populated VPS file lives outside Git with owner-only permissions. `scripts/deploy-vps.mjs` accepts its location through `VPS_ENV_FILE` and never prints its values. Do not maintain parallel handwritten env inventories or commit real secrets.

## VPS build and deploy

The production web image uses the platform-neutral build path:

```bash
pnpm production:web:build
```

That build verifies the tracked immutable releases, builds the Vite shell, validates the web output, and copies the tracked release tree into `apps/web/dist/games`. The source bytes under `releases/game-cdn/` remain the immutable source of truth.

The VPS runtime is defined in:

```text
infra/vps/docker-compose.production.yml
```

It starts only the Play Together `web` and `realtime` containers, attaches them to the existing external `dokploy-network`, publishes no host ports, and lets Dokploy Traefik terminate TLS. The realtime router has higher priority for `/api/realtime`; every other canonical-host request goes to the web container. HTTP redirects to HTTPS through the existing Dokploy middleware and certificates use the existing `letsencrypt` resolver.

Deploy from an exact checkout with:

```bash
VPS_ENV_FILE=/owner/private/path/vps-production.env pnpm vps:deploy
```

The deploy command injects the exact Git SHA as `APP_REVISION`, builds the two images, starts them with Compose health checks, and reports success only after Docker marks the stack healthy. `/api/health` exposes the application version, `runtime: "vps-managed"`, and that exact revision so CI can distinguish a stale VPS from the commit being released.

### CI-gated automatic VPS deploy

The VPS watcher never deploys an arbitrary new `main` commit immediately. It queries the public GitHub Actions API and requires these jobs for the exact `origin/main` SHA to be successful first:

1. `verify`
2. `integration`
3. `prepare-production`

`prepare-production` is a credential-free production-source validation gate; it does not mutate Convex or the VPS. Only after all three jobs are green may the VPS watcher reset its dedicated production checkout to that exact SHA. The watcher installs the locked workspace, deploys the Convex functions from the VPS owner’s authenticated Convex CLI context, and only then runs `pnpm vps:deploy`. The `verify-production` CI job waits until `/api/health.revision` equals its own `GITHUB_SHA`, then verifies realtime, registers immutable manifests, and runs production browser scenarios.

This design needs neither a broad SSH credential nor a Convex deploy key in GitHub Actions. A failing verify/integration/prepare gate cannot be auto-deployed, and a failed VPS-side Convex deploy prevents the container revision from advancing.

### Ticket verification boundary

Primary VPS production deliberately does not share HMAC signing keys with the application host. Convex remains the authority that issues and verifies signed bearer tickets:

- realtime tickets are issued by `tickets:issue` and verified once by `gatewayTickets:verifyRealtime` during the WebSocket upgrade;
- paid-template tickets are verified once by `gatewayTickets:verifyTemplateDownload` before the VPS creates a short-lived private Blob URL;
- both verifier actions validate signature, schema, issuer/audience, expiry, issue time, and maximum ticket lifetime inside Convex;
- the VPS validates returned claims again against the shared contract schema and then continues gameplay directly on the realtime container;
- verifier calls have a bounded timeout and fail closed; the bearer ticket is never logged.

Local/self-hosted and Vercel rollback runtimes may still verify HMAC tickets directly with `JOIN_TICKET_SECRET` / `TEMPLATE_DOWNLOAD_SECRET`, including the optional `*_NEXT` verifier keys for planned zero-downtime rotations. That fallback is not part of the primary VPS secret surface.

### Realtime coordination and release control

The initial VPS cutover continues to require the existing managed `REDIS_URL`. Even with one realtime container today, Redis remains enabled so blocked-release propagation and the already-tested release-control contract are unchanged, and a later second replica can be added without changing room semantics.

Redis remains transient:

- Convex is the durable control plane for users, rooms, membership, play state, tickets, and immutable game metadata.
- Redis stores short-lived coordination leases/snapshots and the exact blocked-release set plus Pub/Sub updates.
- Browser heartbeats refresh transient leases; coordinator failure stays fail-closed rather than silently diverging.
- The realtime gateway awaits release-control readiness before accepting room traffic.

Production requires:

```text
REDIS_URL=<existing-managed-redis-connection-url>
REQUIRE_DISTRIBUTED_COORDINATION=true
```

The VPS receives `REDIS_URL` only through its private env file. CI temporarily uses Vercel CLI `pull` only to read the already-existing Redis integration for release-control reconciliation; it does **not** run `vercel build` or `vercel deploy` on the primary release path.

### Legacy Vercel rollback build

`vercel.json` remains valid as a rollback boundary. `pnpm vercel:build` aliases the same platform-neutral production artifact preparation and still builds the realtime adapter required by the legacy Vercel runtime. Do not delete it until the VPS rollback window has closed.

## Convex Cloud

Production and development use separate Convex deployments. Interactive environment operations should use `--prod` explicitly. The CI-gated VPS watcher runs `convex deploy` only from its isolated production checkout after the exact main SHA has passed GitHub gates; Convex CLI semantics target that project’s default production deployment for `deploy`.

Convex-owned values are generated in `.env.convex.production.example`; Google OAuth has the safer two-variable `.env.convex.google.example`. Place these server values in the production Convex deployment rather than exposing them through Vite/browser variables. `.env.production.example` is only the aggregate production/CI inventory.

`RESEND_API_KEY` is consumed only by Convex server actions. It must never be exposed as a Vite variable or shipped to the VPS browser output.

### Google sign-in

Google sign-in is capability-gated. If either Google credential is absent, the backend registers only the password provider and the browser hides the Google button. This keeps production usable while OAuth is being configured and avoids fake credentials or broken redirects.

Create a **dedicated Google OAuth Web application** for Play Together. Use:

```text
Application origin: https://game.rahmanef.com
Authorized redirect URI: https://upbeat-dog-398.convex.site/api/auth/callback/google
```

Store `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in the **production Convex deployment environment**, not in VPS/Vercel browser variables or the repository. They are listed explicitly in `.env.convex.google.example` and in the full `.env.convex.production.example`. Never apply the literal placeholders to Convex: replace them with the real Google Web OAuth client values first. Development should use a separate Google OAuth client and callback for its own Convex deployment.

## VPS environment

Use `.env.vps.production.example` as the primary web/realtime checklist and `.env.convex.production.example` for values owned by the Convex production deployment. `.env.vercel.production.example` is now rollback-only. The VPS does **not** receive `JOIN_TICKET_SECRET` or `TEMPLATE_DOWNLOAD_SECRET`: both signing secrets remain inside Convex (and the temporary Vercel rollback runtime). The VPS uses `TICKET_VERIFIER_CONVEX_URL` for one fail-closed verification call when a realtime connection or paid-template download is authorized. The existing managed `REDIS_URL` and `BLOB_READ_WRITE_TOKEN` are copied into the owner-only VPS runtime env during this transition; neither may be exposed through a `VITE_` variable.

## Password-reset email

Password reset uses one verified sender identity:

```text
Play Together <official@rahmanef.com>
```

The display name, site URL, and Resend `project` tag are dynamic environment values. Transactional mail uses a shared responsive shell with a reusable branded header and safety/footer section. Reset requests are enumeration-safe, rate-limited, and send an 8-digit code that expires after 10 minutes. A reset invalidates the user's other sessions through Convex Auth.

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

A published catalog record contains only commercial metadata plus the private Blob pathname/digest on the server. Users receive a two-minute entitlement ticket; the VPS `/api/templates/download` endpoint exchanges it for an exact-path, short-lived presigned Blob GET URL. Large archives still download directly from Blob instead of crossing the application server.

Checkout is provider-agnostic. A payment system can POST a signed fulfillment event to Convex HTTP `/api/templates/fulfill-purchase`; the HMAC header is `x-play-together-signature`. Duplicate `orderRef` values are idempotent. Purchases made before account creation remain pending and are claimed automatically when a matching authenticated email opens Templates.

## Release order

1. Push the exact release commit to `main`.
2. GitHub Actions runs `verify` and local-stack `integration`.
3. `prepare-production` validates the production Convex sources without production credentials or mutations.
4. The VPS CI-gated watcher sees those three successful jobs, deploys Convex Cloud from the exact `origin/main` SHA, then deploys that same SHA to the VPS containers.
5. `verify-production` waits until `/api/health.revision` equals that SHA and verifies distributed realtime readiness.
6. CI registers immutable manifests against `https://game.rahmanef.com` and reconciles Redis release control.
7. CI runs production browser E2E.
8. For the one-time Vercel→VPS cutover, update DNS only after the VPS origin is healthy; keep the prior Vercel deployment available during the rollback window.

## Local development / legacy self-hosted stack

The original full Docker Compose stack is retained for deterministic local E2E and as a self-hosted Convex development/rollback reference:

```bash
pnpm stack:bootstrap
pnpm stack:config
pnpm stack:down
```

Do not use `docker compose down -v` unless you intentionally want to delete local durable Convex data.

## Rollback

- **Web/realtime:** deploy a previously green Git SHA on the VPS. During the migration window, the former Vercel deployment remains an additional rollback target.
- **Game:** select an already-published immutable game version; never overwrite release bytes.
- **Convex:** use widen-migrate-narrow schema changes and deploy backward-compatible functions first.
- **Domain migration:** do not remove the former Vercel deployment until VPS health/realtime/browser verification and a rollback window are complete.

## ChatGPT / MSO embedded production

The reviewed entry is `/embed`; navigation preserves that prefix, including `/embed/game-frame.html`.
Only that namespace allows the MSO component, ChatGPT, the default ChatGPT sandbox origin, and
HTTPS app-scoped subdomains of `web-sandbox.oaiusercontent.com`. Allowing the sandbox apex does
not allow its subdomains. Every ancestor must match CSP, not only the immediate parent. Normal
app pages remain protected; `*.oaiusercontent.com`, arbitrary HTTPS origins and a bare wildcard
are not permitted. This host-family policy allows rendering only; it is not an authentication grant.

`apps/web/embed-policy.mjs` and Vercel configuration are tested for parity. After mounting a usable
shell, the app sends only the constant `play-together:embed-ready` version-1 marker to its immediate
parent, without assuming the parent's runtime origin equals the MCP metadata domain. This marker
uses `targetOrigin: "*"` specifically because it contains no secrets, room, player or account state.
The MSO receiver must still check `event.source === frame.contentWindow`, the exact game origin,
message type and schema version. Do not add sensitive fields to this public marker.

Run `pnpm test:embed` to execute the actual readiness module across allowed and denied nested
chains. The fixtures cover direct MSO, default and app-scoped sandbox origins, spoofed suffixes,
unreviewed outer/intermediate ancestors and the protected normal app. Fixture hostnames model
host layouts; they are not evidence of the hostname used by a particular user's chat session.
CI runs this before room E2E. Playwright is a verification tool, not the production rendering or
streaming layer; the app renders directly in the user's browser through the MCP Page.

A manual release from a verified commit still requires a real main-branch push, production build,
CDN deployment, immutable Convex catalogue registration and public checks. A successful Git push
alone does not deploy the managed app or register a newly built cartridge.

### Google login from the embedded preview

Google authorization must run in a normal browser tab, not the nested game iframe. The embedded
button highlights the MSO Page's **Google login in browser** action. That action opens only the
registry-owned `/?auth=google` path after the user clicks it; the top-level app then begins the
ordinary Convex Auth Google flow. On a cached older Page, **Open production** remains the fallback.
No Google page is proxied or automated, and no popup sandbox permission is added.

The browser completes the OAuth callback at `/?authCallback=google`; the code is handled once,
removed from the address bar and never sent to the chat host. Failed/cancelled exchanges show
safe recovery UI. This flow intentionally continues gameplay in the browser tab. It does not
silently copy or share sessions with storage-partitioned embeds. Email/password still works
inside the preview. The external action contract is UI-only: no tokens, code, email or arbitrary
URL can be supplied in `mso:app-auth-request`.

Expected provider failures now become `ConvexError` public codes. Missing password accounts and
wrong passwords share `INVALID_CREDENTIALS`; internal faults use `AUTH_UNAVAILABLE`. The client
renders only allowlisted copy plus a hexadecimal request reference, never raw backend text.
The original owner request `cc5881a9a2770a3f` was outside the accessible recent log chunk during
this investigation; a fresh reproduction showed `InvalidAccountId` in `auth:signIn` and the same
previous generic client error. Do not claim the original request was independently identified.

## Console UI, QR sign-in and television compatibility

Platform 0.15.0 adds `deviceLogins`, internal transactional decision/claim operations and a
bounded cleanup cron. Deploy the additive Convex schema/functions before the new frontend.
Do not reset existing users, rooms, credentials, game versions or current room pins. QR creation
is anonymous and rate-limited; approval requires existing authentication. See
[the device sign-in contract](device-sign-in.md) and run `e2e/device-sign-in.spec.ts` using
independent browser contexts. A requesting embedded screen uses its own private proof and
receives a normal Play Together session; no auth credential passes through the chat host.

The frontend build target is Chrome 79 / Firefox 78 / Safari 14 era, with curated polyfills for
platform APIs used by the lobby and built-in remote controller. This is a syntax/feature target,
not a guarantee that every TV exposing that version has the same capabilities. The immutable
Three engine and existing game bundles remain ES2022 and need WebGL 2. Do not rewrite their
published bytes to change compatibility. A display capability gate explains unsupported modes
before mounting the engine; a remote-only controller does not need the 3D renderer.

`/tv.html` and its classic ES5 diagnostic script are independent of React and ES modules. The
main page has a classic-script boot guard and a static link to this help page if modern code
cannot load. HTTP/TLS failures can prevent even this diagnostic page from arriving; never lower
HTTPS security requirements to work around an obsolete TV. Check firmware and use a current
external browser/HDMI source where necessary. Real television model/firmware testing is still
required. Official engine matrices: https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine
and https://developer.samsung.com/smarttv/develop/specifications/web-engine-specifications.html.

User-agent strings only select large-screen ergonomics. Capability checks—not brand strings—
control whether the renderer can start. The header, active panel and navigation stay inside one
viewport; form/list content can scroll internally rather than shrinking required touch targets.
