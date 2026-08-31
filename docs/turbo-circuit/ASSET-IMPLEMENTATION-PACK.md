# Turbo Circuit — Game Asset Implementation Pack

Status: implementation contract only. No generated sheet in this pack is imported by the live cartridge yet.

## Goal

Replace procedural-looking Turbo Circuit visuals in controlled steps with reviewed **game assets**, while preserving authoritative physics, multiplayer snapshots, immutable releases, and responsive display behavior.

The current `0.3.0` display is a Three.js racer. The safe migration path is therefore **hybrid 2.5D first**, not a blind swap to a tilemap.

## Source-of-truth boundaries

- Gameplay state / collision / checkpoints: `games/turbo-circuit/src/server.ts`.
- Current rendering: `games/turbo-circuit/src/display.ts`.
- Generated source art: `games/turbo-circuit/assets/source/generated-2026-08-31/`.
- Source metadata: `source-manifest.json`.
- Future reviewed runtime atlases: `games/turbo-circuit/assets/runtime/`.
- Runtime contract example: `games/turbo-circuit/assets/runtime-manifest.example.json`.

A generated source sheet is never a runtime source of truth.

## 10 generated source sheets

| Source id | File | Intended use | Current decision |
| --- | --- | --- | --- |
| `vehicle.red` | `car-red-sprite-sheet.png` | Player/AI directional car | Hybrid candidate; direction audit required |
| `vehicle.blue` | `car-blue-sprite-sheet.png` | Player/AI directional car | Candidate; regenerate if 8 directions are incomplete |
| `vehicle.yellow` | `car-yellow-sprite-sheet.png` | Player/AI directional car | Candidate; regenerate if 8 directions are incomplete |
| `track.topdown` | `track-tile-collection.png` | Future 2.5D tilemap track | Defer until tile sockets/lane widths are normalized |
| `track.perspective` | `track-tileset.png` | Track reference | Camera mismatch; regenerate before use |
| `track.props` | `track-props-sprite-sheet.png` | Garage, tower, grandstand, billboard, tunnel | Hybrid-ready candidate as Three.js sprites |
| `track.decor` | `trackside-asset-sheet.png` | Trees, bushes, signs, rocks, hay | Hybrid-ready candidate as Three.js sprites |
| `track.hazards` | `hazard-sprite-sheet.png` | Barriers, cones, tires, oil, guardrails | Hybrid-ready visual layer; collision remains geometry |
| `race.pickups-effects` | `pickup-effect-sprite-sheet.png` | Nitro, repair, shield, smoke, impact, explosion | Split into pickup and transient-FX atlases |
| `race.event` | `event-asset-sheet.png` | Start/finish gantries, podium, trophy, warning props | Hybrid-ready candidate |

All ten files are 1448×1086 RGBA with transparent pixels and are pinned by SHA-256 in the source manifest.

## Slicing strategy

### Current generated sheets

Do **not** use a fixed row/column crop. The generated sheets have irregular spacing. Fixed-grid slicing can cut shadows, exhaust effects, or neighboring sprites.

Use this process:

1. Inspect one semantic object at a time.
2. Crop to the visible alpha bounds plus 6–12 px padding.
3. Remove unrelated detached artifacts from that crop.
4. Normalize pivot/anchor.
5. Normalize scale against the asset-family reference.
6. Export the individual frame losslessly.
7. Pack reviewed frames into a deterministic atlas with JSON frame rectangles.

### Normalized vehicle atlas

Final base vehicle output is an explicit 4×2 **directional sprite sheet** contract even though the source sheet is not a grid:

- `dir.000`
- `dir.045`
- `dir.090`
- `dir.135`
- `dir.180`
- `dir.225`
- `dir.270`
- `dir.315`

Each variant must provide all 8 directions. Missing directions are regenerated, never mirrored blindly unless the art is proven symmetric.

Base car frames must not contain boost flame, smoke, skid marks, or brake effects. Those belong in effects atlases.

### Track tile normalization

The top-down tile collection is not usable merely because pieces look compatible. Before runtime use, every candidate tile must satisfy one shared metric:

- identical lane width;
- identical road-edge socket width;
- same camera/projection;
- same pixels-per-world-unit;
- clean entry/exit tangent alignment;
- no perspective change from one tile to another.

The perspective track sheet fails this contract today and is reference-only.

## Runtime folder contract

```text
games/turbo-circuit/assets/
├── source/
│   └── generated-2026-08-31/
│       ├── source-manifest.json
│       └── *.png
├── runtime/
│   ├── vehicles.webp
│   ├── vehicles.atlas.json
│   ├── trackside.webp
│   ├── trackside.atlas.json
│   ├── effects.webp
│   ├── effects.atlas.json
│   └── track/                 # only after 2.5D track migration
└── runtime-manifest.json      # created only when reviewed assets exist
```

`runtime/` may stay empty until review completes. Do not add placeholder runtime files just to satisfy imports.

## Naming convention

Use semantic, renderer-independent keys:

```text
car.red.dir.000
car.red.dir.045
car.blue.dir.180
car.yellow.dir.315

track.straight.1lane
track.curve.90.left
track.hairpin.left
track.start-finish

prop.grandstand.large
prop.garage.double
prop.control-tower
prop.billboard.wide

decor.tree.round
decor.tree.pine
decor.rock.large

hazard.barrier.red-white
hazard.cone
hazard.oil-spill

pickup.nitro
pickup.repair
pickup.shield
pickup.coin

fx.smoke.large
fx.skid
fx.impact
fx.explosion

event.gantry.start
event.gantry.finish
event.podium
event.trophy
```

Never encode source sheet row/column into public runtime names.

## Pivot rules

- Car: pivot at the ground contact center between rear/front axles, not the transparent-image center.
- Tree/sign/building: pivot at ground contact center.
- Barrier/guardrail: pivot at footprint center.
- World pickup: pivot at ground center; UI pickup icon gets its own crop/scale.
- Smoke/explosion: pivot at effect origin, not bounding-box center.

## Recommended renderer migration

### Phase 1 — trackside hybrid

Keep the current Three.js road, camera, physics and server state. Replace procedural trackside meshes incrementally with `THREE.Sprite` or camera-facing planes using reviewed trackside atlases.

First targets:

1. trees and bushes;
2. billboards/signs;
3. grandstands/garage/control tower;
4. barriers/cones/tires as visual overlays while collision geometry remains invisible/authoritative.

This immediately improves visual identity without changing physics.

### Phase 2 — directional vehicle sprites

Replace `carMesh()` visually with a sprite-plane vehicle component while preserving racer transforms from snapshots.

At render time:

1. compute vehicle heading relative to active camera;
2. quantize to nearest 45°;
3. choose `car.<variant>.dir.<angle>`;
4. preserve interpolated x/z/heading from the existing smoothing layer;
5. render brake/boost/smoke as separate effects.

Do not alter server steering conventions while changing visuals.

### Phase 3 — pickups and effects

Add world pickups and transient FX as independent entities. Their lifecycle must not mutate vehicle base sprites.

### Phase 4 — 2.5D track migration

Only after track tiles are regenerated/normalized should the procedural ellipse be replaced. This is a gameplay/display release and requires a new immutable Turbo Circuit version.

## Remote/controller boundary

The remote controller is **not part of the game asset-sheet pipeline**. Its frame, joystick geometry, buttons and responsive shell should be CSS/SVG. Do not use the generated car/track sheets as remote chrome.

The prior raster joystick/pedal experiment should be treated as temporary UI art and removed during the dedicated SVG-controller cleanup.

## Performance targets

- One atlas texture per major family where practical.
- Avoid one texture request per prop.
- Prefer reviewed lossless WebP/PNG with alpha.
- Decode once and reuse textures across all instances.
- Dispose atlas textures with the game display lifecycle.
- Do not send asset data through realtime/Convex.
- Trackside visual changes must not change server snapshot payloads.

## Acceptance gates before runtime wiring

Every source family must pass:

- semantic frame completeness;
- clean transparent edge with no accidental neighboring sprite;
- consistent camera/projection;
- consistent scale;
- correct pivot metadata;
- no baked label unless the prop itself physically requires signage;
- no generated watermark/text artifacts;
- no purple/neon styling unless intentionally requested for a specific gameplay object;
- deterministic atlas manifest;
- source SHA validation.

Then run the normal repo gates plus browser capture for desktop, handheld portrait, handheld landscape and split display.

## Versioning

The source pack and documentation may evolve without changing the `0.3.0` cartridge because they are not imported. The first commit that wires a runtime asset into `display.ts` changes cartridge bytes and therefore requires a new semantic game version, e.g. `0.4.0` for a renderer-level visual migration.
