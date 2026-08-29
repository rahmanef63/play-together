# Security model

## Trust boundaries

1. Browser user input is untrusted.
2. Game browser bundles are trusted publisher code but run in a restricted iframe.
3. Game server bundles are trusted publisher code and run in isolated workers, not a hostile-code sandbox.
4. Convex and deployment secret stores are trusted.
5. Public manifests/CDN responses are untrusted until their expected SHA-256 digest is verified.

## Authentication and admission

- Convex Auth owns account sessions.
- Password secrets use PBKDF2-SHA-256 with per-secret random salt.
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
