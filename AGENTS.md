# Play Together agent rules

## Non-negotiable architecture

1. Games may import only `@play-together/game-sdk`, `@play-together/contracts`, and their own files.
2. Platform packages and apps must never statically import a concrete `games/*` package.
3. A game release is immutable and addressed by `gameId`, `version`, manifest URL, and SHA-256 digest.
4. Existing rooms stay pinned to their original release. Never mutate or auto-upgrade an active room.
5. Convex is the durable control plane. Never write controller frames or snapshots to Convex at tick rate.
6. The realtime gateway is transient and authoritative. One game crash must not stop another room.
7. Browser game code runs only inside the sandboxed frame and communicates through validated messages.
8. Server game modules are trusted publisher code. Do not market worker threads as an OS security sandbox.
9. Do not add compatibility files, duplicate APIs, re-export shims, placeholder modules, or second sources of truth.
10. Do not commit `.env`, admin keys, game-publish tokens, join-ticket secrets, JWT keys, or generated local state.

## Vertical-slice flow

Organize changes by user capability, not by generic technical layer:

- identity and registration;
- published game catalog;
- room discovery and creation;
- password and capacity admission;
- connection-ticket issuance;
- realtime room lifecycle;
- device modes and game frame;
- game publication;
- operations and security.

A slice may span UI, Convex, contracts, gateway, game SDK, and tests. Keep its public boundary explicit and avoid reaching into another slice's internals.

## SSOT

- Convex generated API: `convex/_generated/api`.
- Wire and manifest schemas: `packages/contracts`.
- Game runtime interfaces: `packages/game-sdk`.
- Published release catalog: immutable manifests in the game CDN plus registered digest in Convex.
- Environment names and deployment rules: `.env.example` and `docs/deployment.md`.
- Commands and verification gates: root `package.json`.

## Required verification

Before merging or pushing:

```bash
pnpm lint
pnpm architecture:check
pnpm typecheck
pnpm test
pnpm build
pnpm smoke:realtime
pnpm security:check
```

For changes to auth, rooms, mode launch, manifests, gateway, Compose, or browser code, recreate the local stack and run:

```bash
pnpm stack:bootstrap
pnpm test:e2e
```

A task is not complete because compilation passes. Verify the real registration, admission, pairing, input, snapshot, and reconnect paths.

## Change discipline

- Prefer deletion over keeping obsolete imports alive.
- Add a regression test for every fixed bug.
- Use exact versioned contracts; reject unknown schema/protocol versions.
- Use constant-time comparisons for secrets/signatures where practical.
- Keep public error messages bounded and do not leak internals.
- Bind local admin/data ports to loopback only.
- Never expose the Convex dashboard publicly.
- A new game must prove a distinct controller or display behavior, not merely reuse a platform placeholder.
