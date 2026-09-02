# Turbo Circuit 0.8.1 — Kart Migration

Turbo Circuit 0.8.1 reworks the car game around kart-racing mechanics studied from `casadezian/mariocart` at source commit `f180afdfc7a00218a9761bbf7690b2e083898f02`.

## What was adapted

The Play Together implementation re-authors the useful gameplay ideas inside the existing game SDK/runtime instead of importing the source application's stack:

- manual throttle and braking;
- drift charge with two mini-turbo tiers;
- slipstream/drafting boost;
- boost pads, coins and item boxes;
- generic `BOOST`, `PULSE` and `MINE` items;
- spin/hazard interactions and track rescue;
- four camera modes plus held rear view;
- CPU kart rivals;
- spline-based procedural 3D tracks.

## What was intentionally not copied

The reference repository does not declare a repository-wide license. Its application also contains Nintendo/Mario names and character branding. Turbo Circuit therefore does not copy that branding, characters, track names, React/Express/Gemini application architecture, or Nintendo-specific item names/assets.

The production implementation uses only Play Together-owned/generic presentation and re-authored mechanics. Active source is split into bounded server-authoritative modules under `games/turbo-circuit/src/server`, generic Three.js display modules under `src/display`, and declarative controller topology in `game.config.json`.

## Runtime architecture

```text
shared SVG racing controller
        ↓ validated intent
Turbo Circuit authoritative worker
        ↓ authoritative snapshot
Three.js display / shared or per-player viewport
```

The controller never decides position, collision, drift boost, item hits, pickups, lap progress, or race outcome. Those remain authoritative server state.

## Active catalog

The intended active game catalog is deliberately narrow:

1. Turbo Circuit `0.8.1`
2. Flight Trainer `0.2.6`
3. Sky Strike `0.2.6`

Removed game source packages are not kept as compatibility placeholders. Their previously published immutable release bytes remain in `releases/game-cdn` for historical/pinned-room integrity, while host policy marks those releases `retired` so they are unavailable for new rooms.
