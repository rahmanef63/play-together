# Play Together playable-asset contract

This contract prevents concept art, temporary primitives, or duplicated visual representations from becoming the runtime source of truth.

## 1. Choose one runtime representation

Every playable entity declares its dimensional pipeline in `games/<game>/asset.config.json`.

### 3D games

A playable character, rider, creature, or vehicle that visually represents the player must be a runtime model asset, normally **GLB 2.0**. A procedural primitive may be used for environment dressing, debug geometry, particles, collision visualization, or a bounded error fallback; it must not be the normal playable-character implementation after the character is declared asset-backed.

Character requirements:

- metres as world units; `+Y` is up; root rests on the gameplay ground plane;
- stable named rig, currently `pt-humanoid-v1` for humanoids;
- material slots are part of the model asset, not recreated as a second character definition in UI code;
- required animation clips are declared and validated;
- gameplay hit/hurt data stays server-authoritative and separate from cosmetic mesh detail;
- runtime asset must be declared in `assets/runtime/asset-manifest.json` so release manifests include URL, content type, byte size and SHA-256;
- a generated model must have a committed deterministic generator; re-running the generator with unchanged source must produce the same bytes;
- current per-character browser budget is 1.5 MB unless a measured exception is approved in the asset config;
- menu, character-select, match, result, and launcher preview must use the same character identity/runtime asset family. Do not maintain a separate fake character illustration as the product source of truth.

`pt-humanoid-v1` baseline joints:

`root`, `hips`, `spine`, `chest`, `neck`, `head`, `shoulder.L/R`, `upper_arm.L/R`, `forearm.L/R`, `hand.L/R`, `thigh.L/R`, `shin.L/R`, `foot.L/R`.

Recommended fighting-character clips are `idle`, `guard`, `jab`, `kick`, `hit`, `victory`. A game may add clips but must not silently remove its declared required set.

### 2D games

A playable 2D entity must use a **spritesheet atlas plus JSON metadata**, not a collection of unrelated images.

The asset config declares the image asset, metadata asset and required animations. Metadata must contain:

- atlas frame rectangles;
- one canonical pivot/origin in normalized or pixel coordinates;
- frame duration or animation FPS;
- animation sequences by name;
- optional attachment/event markers;
- gameplay hitboxes only when they are visual hints; server-authoritative collision remains separate.

PNG or WebP are accepted. Transparent padding should be minimized and sheets should stay at or below 4096×4096 unless measured device testing justifies more.

## 2. Generation and validation

`pnpm assets:check` validates every opted-in `asset.config.json` and is part of `pnpm verify`.

For 3D characters it checks GLB 2.0 structure, declared runtime asset, required rig nodes, required animation names, minimum model/material complexity and runtime byte budget. For 2D assets it checks the sheet declaration plus metadata frames, pivot and required animation names.

The generator is source. The generated playable asset is also committed because release builds must never depend on an external generation service or network call.

## 3. Release rules

Published game bytes are immutable. Any change to a playable model, material, rig, spritesheet, animation or asset manifest requires a new game version. Existing room pins remain untouched.

Launcher preview media is derived from the real runtime after the asset is loaded. Concept art can be kept as design reference outside the runtime asset path, but it is never substituted for an unimplemented character.

## 4. Current Clash Arena application

Clash Arena is the first enforced 3D-character implementation. `Nova Rin` and `Kite Vale` are generated as GLB assets from deterministic project-owned geometry/rig scripts. The fight renderer loads the verified GLBs from the game manifest and drives their named rig joints from authoritative combat snapshots. The GLBs also carry reusable `idle`, `guard`, `jab`, `kick`, `hit`, and `victory` clips for menu/select/result presentation.
