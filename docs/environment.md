# Environment variables

This file is generated from `scripts/environment-manifest.mjs`. Do not hand-maintain duplicate env inventories.
Run `pnpm env:examples` after adding, removing, or changing an environment contract.

| Variable | Scope | Secret | Source | Purpose |
| --- | --- | --- | --- | --- |
| `COMPOSE_PROJECT_NAME` | local | no | Project configuration / platform integration | Project-owned Compose namespace. |
| `BIND_ADDRESS` | local | no | Project configuration / platform integration | Host interface for local published ports. |
| `WEB_PORT` | local | no | Project configuration / platform integration | Local web port. |
| `REALTIME_PORT` | local | no | Project configuration / platform integration | Local realtime port. |
| `GAME_CDN_PORT` | local | no | Project configuration / platform integration | Local immutable game CDN port. |
| `CONVEX_PORT` | local | no | Project configuration / platform integration | Local self-hosted Convex API port. |
| `CONVEX_SITE_PORT` | local | no | Project configuration / platform integration | Local self-hosted Convex site port. |
| `CONVEX_DASHBOARD_PORT` | local | no | Project configuration / platform integration | Local Convex dashboard port. |
| `VITE_CONVEX_URL` | both | no | Convex dashboard → deployment URL | Browser-visible Convex deployment URL. |
| `VITE_REALTIME_URL` | both | no | Project configuration / platform integration | Browser-visible realtime URL. Production may leave this unset to use same-origin /api/realtime. |
| `GAME_CDN_PUBLIC_ORIGIN` | both | no | Project configuration / platform integration | Public immutable game asset origin. |
| `ALLOWED_ORIGINS` | both | no | Project configuration / platform integration | Exact browser origins accepted by realtime. |
| `GAME_MODULE_ORIGINS` | both | no | Project configuration / platform integration | Exact origins allowed for game module loading. |
| `GAME_MODULE_FETCH_ORIGIN_MAP` | both | no | Project configuration / platform integration | Optional public-to-private module fetch routing map. |
| `ALLOW_INSECURE_GAME_ORIGINS` | both | no | Project configuration / platform integration | Allows HTTP game origins only for local development. |
| `JOIN_TICKET_SECRET` | both | yes | Generate locally with pnpm env:local; create a separate production secret | Shared by Convex ticket issuance and realtime verification. |
| `GAME_PUBLISH_TOKEN` | both | yes | Generate locally with pnpm env:local; store production value in Convex/CI | Authorizes immutable game publication. |
| `TEMPLATE_DOWNLOAD_SECRET` | both | yes | Project configuration / platform integration | Signs private template download tickets. |
| `TEMPLATE_PUBLISH_TOKEN` | both | yes | Project configuration / platform integration | Authorizes template publication. |
| `TEMPLATE_SALES_WEBHOOK_SECRET` | both | yes | Create in the checkout/payment provider webhook settings | Validates template purchase webhooks. |
| `CONTENT_SECURITY_POLICY` | runtime | no | Project configuration / platform integration | Optional server CSP override; omit to use the hardened default. |
| `CONVEX_SELF_HOSTED_URL` | local | no | Project configuration / platform integration | Admin/deploy URL for the local self-hosted Convex backend. |
| `CONVEX_SELF_HOSTED_ADMIN_KEY` | local | yes | Project configuration / platform integration | Generated local Convex admin key; normally managed under .local/. |
| `CONVEX_INSTANCE_NAME` | local | no | Project configuration / platform integration | Self-hosted Convex instance name. |
| `CONVEX_INSTANCE_SECRET` | local | yes | Project configuration / platform integration | Self-hosted Convex instance secret; pnpm env:local generates it. |
| `CONVEX_CLOUD_ORIGIN` | local | no | Project configuration / platform integration | Public API origin advertised by local Convex. |
| `CONVEX_SITE_ORIGIN` | local | no | Project configuration / platform integration | Public site/auth origin advertised by local Convex. |
| `REDACT_LOGS_TO_CLIENT` | local | no | Project configuration / platform integration | Redacts self-hosted Convex logs sent to clients. |
| `DISABLE_METRICS_ENDPOINT` | local | no | Project configuration / platform integration | Controls local Convex metrics endpoint. |
| `DISABLE_BEACON` | local | no | Project configuration / platform integration | Disables self-hosted Convex telemetry beacon. |
| `DOCUMENT_RETENTION_DELAY` | local | no | Project configuration / platform integration | Self-hosted Convex document retention delay. |
| `UPSTREAM_ORIGIN` | local | no | Project configuration / platform integration | Development loopback proxy upstream override. |
| `CONVEX_URL` | production | no | Convex dashboard → deployment URL | Server/release tooling Convex deployment URL. |
| `CONVEX_SITE_URL` | production | no | Convex dashboard → deployment site URL | Convex Auth issuer/site URL; typically provided by Convex runtime. |
| `SITE_URL` | production | no | Project configuration / platform integration | Canonical application URL used by Convex Auth. |
| `JWT_PRIVATE_KEY` | production | yes | Generate/configure through Convex Auth setup | Convex Auth signing private key. |
| `JWKS` | production | yes | Generate/configure through Convex Auth setup | Convex Auth JSON Web Key Set matching JWT_PRIVATE_KEY. |
| `AUTH_GOOGLE_ID` | production | no | Google Cloud Console → APIs & Services → Credentials | Google OAuth Web client ID. |
| `AUTH_GOOGLE_SECRET` | production | yes | Google Cloud Console → APIs & Services → Credentials | Google OAuth Web client secret. |
| `CONVEX_DEPLOY_KEY` | ci | yes | Convex dashboard → Project settings → Deploy keys | CI key used to deploy Convex production. |
| `RESEND_API_KEY` | production | yes | Resend dashboard → API Keys | Server-only Resend API key. |
| `EMAIL_FROM_ADDRESS` | both | no | Resend dashboard → Domains after DNS verification | Verified transactional sender address. |
| `EMAIL_PROJECT_NAME` | both | no | Project configuration / platform integration | Brand name rendered in transactional email. |
| `EMAIL_PROJECT_TAG` | both | no | Project configuration / platform integration | Stable project tag sent to the email provider. |
| `EMAIL_REPLY_TO` | both | no | Project configuration / platform integration | Optional reply-to mailbox. |
| `EMAIL_SITE_URL` | both | no | Project configuration / platform integration | Canonical site link used in email header/footer. |
| `REDIS_URL` | production | yes | Vercel project → Storage/Marketplace Redis integration | Cross-function room coordination and release-control Redis connection. |
| `BLOB_READ_WRITE_TOKEN` | production | yes | Vercel project → Storage → Blob | Private template package Blob credential. |
| `REQUIRE_DISTRIBUTED_COORDINATION` | both | no | Project configuration / platform integration | Fails production realtime startup when distributed coordination is unavailable. |
| `RELEASE_CONTROL_REQUIRED` | production | no | Project configuration / platform integration | Requires release-control mirror reconciliation during managed publication. |
| `ALLOW_MISSING_ORIGIN` | runtime | no | Project configuration / platform integration | Realtime compatibility override; keep false outside explicit non-browser testing. |
| `ROOM_IDLE_TIMEOUT_MS` | both | no | Project configuration / platform integration | Room worker idle timeout. |
| `MAX_PAYLOAD_BYTES` | both | no | Project configuration / platform integration | Maximum realtime payload size. |
| `VERCEL` | platform | no | Automatically injected by Vercel | Vercel runtime marker used to enforce managed coordination behavior. |
| `VERCEL_URL` | platform | no | Automatically injected by Vercel | Current Vercel deployment hostname used for exact origin admission. |
| `VERCEL_PROJECT_PRODUCTION_URL` | platform | no | Automatically injected by Vercel | Canonical Vercel production hostname used for origin admission. |
| `VERCEL_TOKEN` | ci | yes | Vercel account settings → Tokens | CLI/CI deployment token. |
| `VERCEL_ORG_ID` | ci | no | Vercel project link metadata (.vercel/project.json) | Vercel project owner/team ID. |
| `VERCEL_PROJECT_ID` | ci | no | Vercel project settings or .vercel/project.json | Vercel project ID. |
| `E2E_BASE_URL` | tooling | no | Project configuration / platform integration | Playwright target application URL. |
| `E2E_REALTIME_HEALTH_URL` | tooling | no | Project configuration / platform integration | Playwright/release realtime readiness endpoint. |
| `CHROME_PATH` | tooling | no | Project configuration / platform integration | Optional Playwright Chrome executable override. |
| `PREVIEW_GAME_ID` | tooling | no | Project configuration / platform integration | Limits gameplay preview capture to one game. |
| `REDIS_TEST_URL` | tooling | yes | Project configuration / platform integration | Enables the Redis integration test when explicitly supplied. |
| `HOST` | runtime | no | Project configuration / platform integration | HTTP/realtime bind host override. |
| `PORT` | runtime | no | Project configuration / platform integration | HTTP/realtime bind port override. |
| `WEB_ROOT` | runtime | no | Project configuration / platform integration | Static web root override. |
| `GAME_CDN_ROOT` | runtime | no | Project configuration / platform integration | Immutable game CDN filesystem root. |
| `GAME_WORKER_PATH` | runtime | no | Project configuration / platform integration | Realtime worker bundle override. |
| `MODULE_CACHE_DIR` | runtime | no | Project configuration / platform integration | Verified game module cache directory. |
| `REALTIME_CONNECT_PATH` | runtime | no | Project realtime runtime configuration | Realtime WebSocket connect path override. |

