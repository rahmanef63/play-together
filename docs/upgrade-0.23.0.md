# Play Together 0.23.0 delivery history

## Delivery status

**Resolved:** the changes below shipped in 0.23.2, commit `4d5834fe7a5308e6b451bbdd593f6f0f87e1783c`. Dokploy and all CI stages, including production browser verification, passed in [run 34172797194](https://github.com/rahmanef63/play-together/actions/runs/34172797194). The candidate notes below record the earlier blocked attempt, not current deployment status.

### Original candidate status

Implemented in an isolated worktree based on production commit `4197b5f`. This is not a deployed release. The original dirty checkout remains untouched.

## Ten additions

1. Device-local favorite games (version-independent game identity; tolerant of unavailable storage).
2. Combined title search and party-size filtering.
3. Random game selection respecting current filters and avoiding the current game when alternatives exist.
4. Screen wake lock during active play, with visibility/unmount cleanup and unsupported-device fallback.
5. Keyboard aliases generated from the same immutable control declarations used by gameplay.
6. Turbo Circuit one-tap cruise, brake cancellation, rescue/reset cleanup and visible cruise state.
7. Flight Trainer next-checkpoint distance/altitude guidance and landing configuration coaching.
8. Sky Strike targeted incoming-missile distance warning, cleared on removal/respawn/round end.
9. Ridge Rush distance to the next required checkpoint, then finish line.
10. Clash Arena live air-combo, guarding, stun, health/meter and Surge readiness readouts.

## Additional corrections

- Clamp stale catalog selection to an available game.
- Lock landscape after entering fullscreen rather than after exiting it.
- Trap menu/help focus, restore focus on close, and stop keyboard gameplay through How To.
- Keep menu focus stable while connection state updates.
- Rebuild the Ridge Rush results only when the actual result data changes.

## Verification and blocker

`pnpm verify` passed: lint, boundaries, asset checks, TypeScript, 359 passing tests (2 optional Redis tests skipped), build, authoritative realtime smoke, security source scan and dependency audit with no known vulnerabilities.

Required `pnpm stack:bootstrap` failed because GHCR denied pulling the pinned Convex backend image `sha256:1f2044e3eac463ac78973b136c0baf72d4ada602611d853d6f99f280e29e0a98`. The full integration E2E suite therefore could not run. AGENTS.md requires this gate before push/merge. Do not weaken the gate or substitute an unverified image.

The cloud browser returned 502 / connection refused on production, including one reload. VPS health independently reported production 0.22.2 with matching revision and readyRevision. No visual acceptance claim is made for this candidate.

## Resume

Restore authorized access to the pinned integration images. From this branch run `pnpm stack:bootstrap`, then `pnpm test:e2e`, review mobile/desktop rendering and exercise the ten additions. Only after required gates pass, push/merge and let the CI-gated VPS watcher promote the exact verified commit. Confirm health revision and readyRevision plus published cartridge digests. Existing rooms stay pinned to their original release.
