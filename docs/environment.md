# Environment setup

This file is generated from `scripts/environment-manifest.mjs` plus `scripts/environment-platforms.mjs`.
Run `pnpm env:examples` after changing an environment contract or its deployment destination.

## Which file goes where

| File | Use | Destination |
| --- | --- | --- |
| `.env.example` | Local development | Local project `.env` / `pnpm env:local` |
| `.env.convex.google.example` | Google OAuth only; safest activation file | Convex production deployment environment variables |
| `.env.convex.production.example` | Full Convex backend/auth/email/secrets reference | Convex production deployment environment variables |
| `.env.vercel.production.example` | Web/realtime managed runtime | Vercel Production environment variables |
| `.env.production.example` | Aggregate production + CI reference | Do not paste wholesale into one provider |
| `.env.all.example` | Complete 71-variable inventory | Documentation/reference only |

## Google OAuth: production

1. In Google Cloud / Google Auth Platform create an OAuth client with application type **Web application**.
2. Use `https://game.rahmanef.com` as the production application origin.
3. Add this exact authorized redirect URI: `https://upbeat-dog-398.convex.site/api/auth/callback/google`.
4. Copy the Google **Client ID** into `AUTH_GOOGLE_ID`.
5. Copy the Google **Client secret** into `AUTH_GOOGLE_SECRET`.
6. Put both values in **Convex production deployment `upbeat-dog-398`**, not Vercel and never a `VITE_` variable.
7. Do not set literal placeholders in Convex. Both values are capability-gated; a non-empty fake value would expose a broken Google button.

For Google only, copy `.env.convex.google.example` to a private `.env.convex.google`, replace both placeholders, then apply only those two values:

```bash
npx convex env --deployment upbeat-dog-398 set --from-file .env.convex.google --force
npx convex env --deployment upbeat-dog-398 list --names-only
```

`CONVEX_SITE_URL` is supplied automatically by Convex; do not manually copy it into the deployment environment.

## Complete inventory

| Variable | Put it in | Scope | Secret | Source | Purpose |
| --- | --- | --- | --- | --- | --- |
| `COMPOSE_PROJECT_NAME` | Local .env | local | no | Project configuration / platform integration | Project-owned Compose namespace. |
| `BIND_ADDRESS` | Local .env | local | no | Project configuration / platform integration | Host interface for local published ports. |
| `WEB_PORT` | Local .env | local | no | Project configuration / platform integration | Local web port. |
| `REALTIME_PORT` | Local .env | local | no | Project configuration / platform integration | Local realtime port. |
| `GAME_CDN_PORT` | Local .env | local | no | Project configuration / platform integration | Local immutable game CDN port. |
| `CONVEX_PORT` | Local .env | local | no | Project configuration / platform integration | Local self-hosted Convex API port. |
| `CONVEX_SITE_PORT` | Local .env | local | no | Project configuration / platform integration | Local self-hosted Convex site port. |
| `CONVEX_DASHBOARD_PORT` | Local .env | local | no | Project configuration / platform integration | Local Convex dashboard port. |
| `VITE_CONVEX_URL` | Vercel production project + Local .env | both | no | Convex dashboard → deployment URL | Browser-visible Convex deployment URL. |
| `VITE_REALTIME_URL` | Vercel production project + Local .env | both | no | Project configuration / platform integration | Browser-visible realtime URL. Production may leave this unset to use same-origin /api/realtime. |
| `GAME_CDN_PUBLIC_ORIGIN` | Vercel production project + Local .env | both | no | Project configuration / platform integration | Public immutable game asset origin. |
| `ALLOWED_ORIGINS` | Vercel production project + Local .env | both | no | Project configuration / platform integration | Exact browser origins accepted by realtime. |
| `GAME_MODULE_ORIGINS` | Convex production deployment + Vercel production project + Local .env | both | no | Project configuration / platform integration | Exact origins allowed for game module loading. |
| `GAME_MODULE_FETCH_ORIGIN_MAP` | Convex production deployment + Vercel production project + Local .env | both | no | Project configuration / platform integration | Optional public-to-private module fetch routing map. |
| `ALLOW_INSECURE_GAME_ORIGINS` | Convex production deployment + Vercel production project + Local .env | both | no | Project configuration / platform integration | Allows HTTP game origins only for local development. |
| `JOIN_TICKET_SECRET` | Convex production deployment + Vercel production project + Local .env | both | yes | Generate locally with pnpm env:local; create a separate production secret | Shared by Convex ticket issuance and realtime verification. |
| `GAME_PUBLISH_TOKEN` | Convex production deployment + Local .env | both | yes | Generate locally with pnpm env:local; store production value in Convex/CI | Authorizes immutable game publication. |
| `TEMPLATE_DOWNLOAD_SECRET` | Convex production deployment + Vercel production project + Local .env | both | yes | Project configuration / platform integration | Signs private template download tickets. |
| `TEMPLATE_PUBLISH_TOKEN` | Convex production deployment + Local .env | both | yes | Project configuration / platform integration | Authorizes template publication. |
| `TEMPLATE_SALES_WEBHOOK_SECRET` | Convex production deployment + Local .env | both | yes | Create in the checkout/payment provider webhook settings | Validates template purchase webhooks. |
| `CONTENT_SECURITY_POLICY` | Vercel production project | runtime | no | Project configuration / platform integration | Optional server CSP override; omit to use the hardened default. |
| `CONVEX_SELF_HOSTED_URL` | Local .env | local | no | Project configuration / platform integration | Admin/deploy URL for the local self-hosted Convex backend. |
| `CONVEX_SELF_HOSTED_ADMIN_KEY` | Local .env | local | yes | Project configuration / platform integration | Generated local Convex admin key; normally managed under .local/. |
| `CONVEX_INSTANCE_NAME` | Local .env | local | no | Project configuration / platform integration | Self-hosted Convex instance name. |
| `CONVEX_INSTANCE_SECRET` | Local .env | local | yes | Project configuration / platform integration | Self-hosted Convex instance secret; pnpm env:local generates it. |
| `CONVEX_CLOUD_ORIGIN` | Local .env | local | no | Project configuration / platform integration | Public API origin advertised by local Convex. |
| `CONVEX_SITE_ORIGIN` | Local .env | local | no | Project configuration / platform integration | Public site/auth origin advertised by local Convex. |
| `REDACT_LOGS_TO_CLIENT` | Local .env | local | no | Project configuration / platform integration | Redacts self-hosted Convex logs sent to clients. |
| `DISABLE_METRICS_ENDPOINT` | Local .env | local | no | Project configuration / platform integration | Controls local Convex metrics endpoint. |
| `DISABLE_BEACON` | Local .env | local | no | Project configuration / platform integration | Disables self-hosted Convex telemetry beacon. |
| `DOCUMENT_RETENTION_DELAY` | Local .env | local | no | Project configuration / platform integration | Self-hosted Convex document retention delay. |
| `UPSTREAM_ORIGIN` | Local .env | local | no | Project configuration / platform integration | Development loopback proxy upstream override. |
| `CONVEX_URL` | Production tooling/config | production | no | Convex dashboard → deployment URL | Server/release tooling Convex deployment URL. |
| `CONVEX_SITE_URL` | Production tooling/config | production | no | Convex dashboard → deployment site URL | Convex Auth issuer/site URL; typically provided by Convex runtime. |
| `SITE_URL` | Convex production deployment | production | no | Project configuration / platform integration | Canonical application URL used by Convex Auth. |
| `JWT_PRIVATE_KEY` | Convex production deployment | production | yes | Generate/configure through Convex Auth setup | Convex Auth signing private key. |
| `JWKS` | Convex production deployment | production | yes | Generate/configure through Convex Auth setup | Convex Auth JSON Web Key Set matching JWT_PRIVATE_KEY. |
| `AUTH_GOOGLE_ID` | Convex Google OAuth production + Convex production deployment | production | no | Google Cloud Console → APIs & Services → Credentials | Google OAuth Web client ID. |
| `AUTH_GOOGLE_SECRET` | Convex Google OAuth production + Convex production deployment | production | yes | Google Cloud Console → APIs & Services → Credentials | Google OAuth Web client secret. |
| `CONVEX_DEPLOY_KEY` | CI secret/env store | ci | yes | Convex dashboard → Project settings → Deploy keys | CI key used to deploy Convex production. |
| `RESEND_API_KEY` | Convex production deployment | production | yes | Resend dashboard → API Keys | Server-only Resend API key. |
| `EMAIL_FROM_ADDRESS` | Convex production deployment + Local .env | both | no | Resend dashboard → Domains after DNS verification | Verified transactional sender address. |
| `EMAIL_PROJECT_NAME` | Convex production deployment + Local .env | both | no | Project configuration / platform integration | Brand name rendered in transactional email. |
| `EMAIL_PROJECT_TAG` | Convex production deployment + Local .env | both | no | Project configuration / platform integration | Stable project tag sent to the email provider. |
| `EMAIL_REPLY_TO` | Convex production deployment + Local .env | both | no | Project configuration / platform integration | Optional reply-to mailbox. |
| `EMAIL_SITE_URL` | Convex production deployment + Local .env | both | no | Project configuration / platform integration | Canonical site link used in email header/footer. |
| `REDIS_URL` | Vercel production project | production | yes | Vercel project → Storage/Marketplace Redis integration | Cross-function room coordination and release-control Redis connection. |
| `BLOB_READ_WRITE_TOKEN` | Vercel production project | production | yes | Vercel project → Storage → Blob | Private template package Blob credential. |
| `REQUIRE_DISTRIBUTED_COORDINATION` | Vercel production project + Local .env | both | no | Project configuration / platform integration | Fails production realtime startup when distributed coordination is unavailable. |
| `RELEASE_CONTROL_REQUIRED` | Vercel production project | production | no | Project configuration / platform integration | Requires release-control mirror reconciliation during managed publication. |
| `ALLOW_MISSING_ORIGIN` | Vercel production project | runtime | no | Project configuration / platform integration | Realtime compatibility override; keep false outside explicit non-browser testing. |
| `ROOM_IDLE_TIMEOUT_MS` | Vercel production project + Local .env | both | no | Project configuration / platform integration | Room worker idle timeout. |
| `MAX_PAYLOAD_BYTES` | Vercel production project + Local .env | both | no | Project configuration / platform integration | Maximum realtime payload size. |
| `VERCEL` | Injected automatically by Vercel | platform | no | Automatically injected by Vercel | Vercel runtime marker used to enforce managed coordination behavior. |
| `VERCEL_URL` | Injected automatically by Vercel | platform | no | Automatically injected by Vercel | Current Vercel deployment hostname used for exact origin admission. |
| `VERCEL_PROJECT_PRODUCTION_URL` | Injected automatically by Vercel | platform | no | Automatically injected by Vercel | Canonical Vercel production hostname used for origin admission. |
| `VERCEL_TOKEN` | CI secret/env store | ci | yes | Vercel account settings → Tokens | CLI/CI deployment token. |
| `VERCEL_ORG_ID` | CI secret/env store | ci | no | Vercel project link metadata (.vercel/project.json) | Vercel project owner/team ID. |
| `VERCEL_PROJECT_ID` | CI secret/env store | ci | no | Vercel project settings or .vercel/project.json | Vercel project ID. |
| `E2E_BASE_URL` | Local/CI tooling | tooling | no | Project configuration / platform integration | Playwright target application URL. |
| `E2E_REALTIME_HEALTH_URL` | Local/CI tooling | tooling | no | Project configuration / platform integration | Playwright/release realtime readiness endpoint. |
| `CHROME_PATH` | Local/CI tooling | tooling | no | Project configuration / platform integration | Optional Playwright Chrome executable override. |
| `PREVIEW_GAME_ID` | Local/CI tooling | tooling | no | Project configuration / platform integration | Limits gameplay preview capture to one game. |
| `REDIS_TEST_URL` | Local/CI tooling | tooling | yes | Project configuration / platform integration | Enables the Redis integration test when explicitly supplied. |
| `HOST` | Runtime override; normally omit | runtime | no | Project configuration / platform integration | HTTP/realtime bind host override. |
| `PORT` | Runtime override; normally omit | runtime | no | Project configuration / platform integration | HTTP/realtime bind port override. |
| `WEB_ROOT` | Runtime override; normally omit | runtime | no | Project configuration / platform integration | Static web root override. |
| `GAME_CDN_ROOT` | Runtime override; normally omit | runtime | no | Project configuration / platform integration | Immutable game CDN filesystem root. |
| `GAME_WORKER_PATH` | Runtime override; normally omit | runtime | no | Project configuration / platform integration | Realtime worker bundle override. |
| `MODULE_CACHE_DIR` | Runtime override; normally omit | runtime | no | Project configuration / platform integration | Verified game module cache directory. |
| `REALTIME_CONNECT_PATH` | Runtime override; normally omit | runtime | no | Project realtime runtime configuration | Realtime WebSocket connect path override. |

