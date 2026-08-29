# Deployment

## Independent production units

Deploy four units from the same Git commit, but do not couple their release triggers:

| Unit | Dockerfile/image | Public route | Release trigger |
|---|---|---|---|
| Web shell | `apps/web/Dockerfile` | HTTPS | platform changes |
| Realtime gateway | `apps/realtime/Dockerfile` | WSS/HTTPS health | gateway/protocol changes |
| Game CDN | `infra/game-cdn/Dockerfile` | HTTPS | game release changes |
| Convex | pinned backend image + `convex deploy` | HTTPS API/site | schema/function changes |

A game-only release appends a versioned bundle to `releases/game-cdn`, rebuilds/uploads only the Game CDN unit, and registers its new manifest. It does not rebuild web or realtime unless the stable contract itself changes.

## Reference production domain split

The maintained reference deployment uses `game.rahmanef.com` as its player-facing URL:

```text
game.rahmanef.com          web shell / PWA
rt-game.rahmanef.com       WebSocket gateway
games-game.rahmanef.com    immutable game CDN
api-game.rahmanef.com      Convex API/WebSocket
site-game.rahmanef.com     Convex HTTP/auth site
```

Do not expose the Convex dashboard publicly. Access it through a local loopback binding or an authenticated operator tunnel.

## Production environment

Browser-build values:

```text
VITE_CONVEX_URL=https://api-game.rahmanef.com
VITE_REALTIME_URL=wss://rt-game.rahmanef.com/v1/connect
```

Shared backend values:

```text
JOIN_TICKET_SECRET=<same strong value in Convex and realtime>
GAME_PUBLISH_TOKEN=<Convex only + release job>
GAME_MODULE_ORIGINS=https://games-game.rahmanef.com
GAME_CDN_PUBLIC_ORIGIN=https://games-game.rahmanef.com
ALLOWED_ORIGINS=https://game.rahmanef.com
ALLOW_INSECURE_GAME_ORIGINS=false
GAME_MODULE_FETCH_ORIGIN_MAP={}
```

Convex Auth also requires its production JWT/JWKS values plus correct Convex cloud/site origins. Generate keys once, store them in the deployment secret store, and never commit or echo them.

## Compose model

- `docker-compose.yml` is the production-safe base and publishes no host ports.
- `docker-compose.local.yml` binds development ports to `127.0.0.1` and runs an IPv6 loopback bridge so Convex can discover `http://convex-site.localhost:43211` from its own namespace. The bridge is development-only and is not required when a production site domain is routable from the backend.
- the `admin` profile starts the local Convex dashboard.

Validate local composition:

```bash
pnpm stack:config
```

Never use `docker compose down -v` in normal operations; that deletes the durable Convex volume.

## Convex release order

1. Deploy/start the backend with stable persistent storage.
2. Generate or retrieve its admin key without printing it to logs.
3. Sync JWT/JWKS, game-publish token, join-ticket secret, and game-origin allowlist.
4. Run `convex deploy` against the intended backend.
5. Publish the tracked immutable release archive to the game CDN/object store.
6. Register every intended manifest in Convex.
7. Deploy realtime, then web.
8. Run public health, registration, room, WebSocket, and E2E checks.

## Rollback

- Web/realtime: redeploy a known Git SHA.
- Game: choose an already-published immutable game version for new rooms; do not overwrite files.
- Convex: use widen–migrate–narrow schema changes. Never deploy a narrowing schema before data migration and backward-compatible app rollout.


## Dokploy routing for the reference deployment

Attach domains directly to the matching Compose services and ports:

| Host | Service | Internal port |
|---|---|---:|
| `game.rahmanef.com` | `web` | 8080 |
| `rt-game.rahmanef.com` | `realtime` | 8787 |
| `games-game.rahmanef.com` | `game-cdn` | 8080 |
| `api-game.rahmanef.com` | `convex-backend` | 3210 |
| `site-game.rahmanef.com` | `convex-backend` | 3211 |

Do not create a public route for `convex-dashboard`.
