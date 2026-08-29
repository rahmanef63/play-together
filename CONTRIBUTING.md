# Contributing to Play Together

Thanks for contributing. The main design constraint is simple: **a game release must remain independently deployable from the platform and from every other game**.

## Development setup

```bash
pnpm install
pnpm stack:bootstrap
pnpm verify
pnpm verify:stack
```

## Architecture rules

- Keep product work inside a vertical slice where possible.
- `games/*` must not import application internals. Use `@play-together/game-sdk` and `@play-together/contracts`.
- Platform applications must not import a concrete game.
- Published game releases are immutable. Never rewrite a version already present in `releases/game-cdn`.
- Durable room/user/catalog state belongs in Convex; frame-by-frame gameplay belongs in the realtime plane.
- Browser game code runs behind the sandbox/runtime bridge. Do not bypass that boundary with direct platform access.
- Do not commit secrets, ROMs, BIOS/firmware, copyrighted game images, or private user data.

`pnpm architecture:check` enforces key dependency boundaries.

## Before opening a pull request

```bash
pnpm format
pnpm verify
pnpm stack:config
pnpm verify:stack
```

For a game-only change, also verify that another game still builds and that an older published version remains byte-for-byte unchanged.

## Pull requests

Keep PRs focused. Explain:

1. the user-facing or platform problem;
2. the vertical slice changed;
3. compatibility impact on existing rooms/releases;
4. security/trust-boundary impact;
5. tests or screenshots that prove the behavior.

Breaking protocol or manifest changes require an explicit versioning/migration plan.

## Issues

Use the provided issue forms for reproducible bugs and feature proposals. Security vulnerabilities must follow `SECURITY.md` instead of public issues.
