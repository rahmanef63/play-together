# Turbo Circuit asset pipeline

This directory is intentionally split into **source** and **runtime**.

- `source/generated-2026-08-31/` contains the original AI-generated **game asset sheets**. They are immutable review inputs and must never be imported by `display.ts`.
- `runtime/` is reserved for individually reviewed, normalized, atlas-packed runtime assets.
- `runtime-manifest.example.json` documents the target runtime contract only. It is not loaded by the current `0.3.0` cartridge.

## Why source sheets are not sliced by a fixed grid

The generated sheets are RGBA with transparent backgrounds, but object spacing is irregular. A fixed `NxM` crop would cut sprites or include neighboring effects. Source extraction therefore uses semantic object bounds with manual review, then each output is normalized and packed into a deterministic JSON atlas.

## Runtime rules

1. Every runtime frame has one semantic key.
2. Vehicle base frames contain no exhaust, boost flame, skid, or brake-light effect baked into the body sprite.
3. Collision remains authoritative in server/world geometry; trackside sprites are visual only.
4. All atlases must be power-of-two friendly where practical and use lossless WebP/PNG when alpha fidelity matters.
5. Existing Turbo Circuit `0.3.0` remains byte-identical. Runtime asset wiring requires a new game version.
