# Security model

## Trust boundaries

1. Browser user input is untrusted.
2. Game browser bundles are trusted publisher code but run in a restricted iframe.
3. Game server bundles are trusted publisher code and run in isolated workers, not a hostile-code sandbox.
4. Convex and deployment secret stores are trusted.
5. Public manifests/CDN responses are untrusted until their expected SHA-256 digest is verified.

## Authentication and admission

- Convex Auth owns account sessions.
- Existing password secrets keep the repository's PBKDF2-SHA-256 crypto contract with per-secret random salt so migration does not invalidate accounts.
- New/reset passwords require 12–128 characters with uppercase, lowercase, number, and symbol.
- Password-reset requests return the same response whether an account exists or not, use hashed email rate-limit keys, and issue 8-digit codes that expire after 10 minutes.
- Reset email is sent server-side through Resend from `official@rahmanef.com`; the API key never reaches browser code.
- Room passwords are never returned to clients or stored in plaintext.
- Public/private visibility and password protection are separate fields.
- Capacity and membership admission run transactionally.
- Durable mutation rate limits bound account and room abuse.

## Realtime tickets

A ticket is HMAC signed and includes issuer, audience, user, room, role, mode, game ID/version, manifest URL/digest, issue/expiry time, and a random replay ID.

Gateway controls:

- exact browser origin allowlist;
- ticket carried in WebSocket subprotocol, not URL query logs;
- constant-time signature verification;
- expiry and server-side connection-expiry timer;
- one-time replay guard;
- manifest origin allowlist and HTTPS requirement;
- maximum payload size and message schema validation;
- per-connection input rate limit and monotonic input sequence.

## Module integrity

- Publisher computes entry digests and immutable manifest digest.
- Convex fetches and validates a manifest only from an allowlisted origin.
- Browser verifies display/controller bytes before importing a Blob URL.
- Gateway verifies server bytes before caching/importing.
- A release path cannot be overwritten with different bytes.

## Browser frame

The game frame is same-origin but sandboxed without parent DOM permission. Communication uses a narrow postMessage protocol. CSP blocks arbitrary default network/script behavior and the frame receives no product secrets.

### Reviewed MCP preview namespace

Only `/embed` and its leaf game-frame route accept the ChatGPT sandbox host family. The normal
shell retains its strict anti-framing policy. Matching a sandbox hostname does not authenticate
any user, permit reading the parent DOM, or expose application credentials. The lifecycle-ready
message is a public constant sent only to the immediate parent; the receiver validates the source
window and exact game origin. No authentication or game state is added to that message. See the
[deployment contract](deployment.md#chatgpt--mso-embedded-production) and `pnpm test:embed` for
positive and negative browser checks. Never fix a frame denial with global CSP removal or an
arbitrary-URL proxy.

## Commercial template source

- Paid template source never lives in the public Git repository.
- The packer rejects symlinks, credential-like files, common key formats, `.env`, `.git`, and `node_modules`.
- Private source archives are stored in Vercel Private Blob.
- Convex stores entitlement/purchase state and never returns a private Blob pathname in the public template catalog.
- Downloads require an authenticated entitlement, are rate-limited, and use an HMAC ticket with a two-minute maximum lifetime.
- The Vercel download function verifies the ticket and returns only an exact-path, short-lived presigned GET URL.
- Checkout fulfillment uses an HMAC-signed raw request body and idempotent `orderRef`; no payment-provider secret is accepted from the browser.

## Managed realtime boundary

Vercel WebSocket Functions may be restarted or horizontally instantiated, and different players in the same room are not guaranteed to land on one Function instance. Managed production therefore requires the Redis room coordinator. Redis carries only bounded transient connection leases, validated input, presence, and authority snapshots; durable users/rooms/membership/tickets/game metadata remain in Convex. If Redis is missing or becomes unavailable, the realtime room fails closed rather than silently running divergent per-instance simulations. The browser reconnect path remains mandatory.

## Containers

Application containers run as a non-root user where supported, use read-only filesystems, drop Linux capabilities, set `no-new-privileges`, and allocate bounded tmpfs/cache paths. The production Compose base does not publish host ports.

## Known boundary

Worker threads contain ordinary game crashes and memory ceilings, but they share process permissions. Before allowing third-party server bundles, move execution into a separate unprivileged container/microVM with CPU, memory, syscall, network, filesystem, and time limits plus a reviewed publisher-signing process.

## Incident response

1. Disable a compromised game version for new rooms in Convex.
2. Preserve immutable release bytes and deployment logs for analysis.
3. Rotate the game-publish token if publisher access is suspected.
4. Rotate the join-ticket secret in Convex and realtime together; expect active clients to reconnect.
5. Revoke/rotate auth JWT keys when account-token signing is affected.
6. Patch, test, publish a new version, and never rewrite the compromised version.
