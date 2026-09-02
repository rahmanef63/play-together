# Turbo Circuit 0.9.2 — Casa Dezian adaptation + simplified remote

Turbo Circuit 0.9.1 introduced the full audiovisual/procedural pass based on systems studied from `casadezian/mariocart` commit `f180afdfc7a00218a9761bbf7690b2e083898f02`. Turbo Circuit 0.9.2 keeps those immutable gameplay bytes as its baseline while simplifying the phone remote to the requested physical mapping.

The earlier 0.8.x pass brought over the core kart mechanics. Version 0.9.1 extends that work to the neutral procedural rendering, sound and feedback systems that can fit Play Together without importing Nintendo branding or the source application's React/Express/Gemini architecture.

Current implementation includes manual throttle/braking, drift mini-turbos, drafting, bounded CPU rubber-banding, boost pads, coins, item boxes, generic `BOOST/PULSE/MINE` items, bouncing projectiles, hit invulnerability, coin loss, smooth wall glide, wrong-way detection, rescue, multiplayer rematch, four cameras, dynamic FOV/shake, true procedural 3D karts, procedural road/terrain maps, neon/start-gate track geometry, synthesized game audio, speed/item/drift/shield feedback, expandable minimap, and finish confetti.

See `CASA-DEZIAN-AUDIT.md` for the feature-by-feature source audit and explicit exclusion rationale.

## Controller mapping

Turbo Circuit 0.9.2 intentionally exposes only the controls needed on the phone remote:

- left stick — steering; during setup it also selects car/track
- **A — GAS** (hold)
- **B — BRAKE** (hold)
- **X — ITEM** / ability
- **Y — REAR** view (hold)
- **START — READY** during setup/rematch and **PAUSE/RESUME** during a live race

The previous dedicated shoulder GAS/BRAKE/REAR/ITEM buttons plus DRIFT/VIEW/RESET/PAUSE buttons are not rendered on the 0.9.2 phone remote. Their server-side actions remain compatible for historical releases and diagnostics.

## Release discipline

- `0.8.1` remains immutable and retains its historical raster atlas.
- `0.9.1` no longer requires a runtime vehicle atlas; all kart geometry and game audio are procedural.
- Historical release bytes are never overwritten when the source renderer changes.
