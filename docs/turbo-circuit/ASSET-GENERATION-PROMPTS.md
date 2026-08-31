# Turbo Circuit — strict game asset generation prompts

These prompts intentionally use the terms **game assets**, **game asset sheet**, **sprite sheet**, and **tileset**. One generation request produces **one file for one asset family**. If 10 asset families are requested in a session, generate 10 separate files — never one mega-collage containing all families.

## Global prompt contract

Append this contract to every Turbo Circuit game-art request:

```text
Production-ready 2D GAME ASSETS for a classic arcade racing game.
Create ONE GAME ASSET SHEET for ONE asset family only.
Transparent background. No mockup, no poster, no UI screenshot, no contact sheet of unrelated categories.
Consistent camera, consistent projection, consistent scale, consistent light direction, and clean isolated silhouettes.
Classic 1990s arcade-racing visual language, bold readable shapes, warm red/cream/teal/mustard/desaturated-blue palette.
Avoid purple, cyberpunk neon, generic AI glow, photorealism, text artifacts, logos, watermarks, and decorative labels.
Every sprite must be fully contained inside its assigned cell with generous transparent padding and no overlap into another cell.
Designed as real production GAME ASSETS that can be sliced and packed into a runtime texture atlas.
```

## Vehicle — strict 8-direction base sprite sheet

```text
Create a production-ready GAME ASSET SHEET / 8-DIRECTION VEHICLE SPRITE SHEET for Turbo Circuit.
One compact arcade racing car only, [RED / BLUE / YELLOW] variant.
Strict 4 columns × 2 rows grid, exactly 8 equal cells.
Directions in clockwise order: 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°.
Same vehicle identity, wheelbase, body proportions, spoiler, stripe placement and scale in every cell.
Top-down elevated 3/4 arcade racing camera, not eye-level and not isometric.
Each vehicle is centered to the same ground-contact pivot and occupies the same percentage of its cell.
Transparent background.
BASE CAR ONLY: no boost flame, no smoke, no skid marks, no motion blur, no brake-light glow spreading outside the vehicle.
No text. No logo. No extra variant. No duplicate direction.
Production GAME ASSETS, clean sprite sheet, exact slicing grid.
```

Generate red, blue and yellow as three separate files.

## Vehicle effects sheet

```text
Create ONE production-ready GAME ASSET SHEET for arcade racing VEHICLE EFFECTS.
Strict 4 columns × 2 rows, equal cells, transparent background.
Include only: small boost flame, large boost flame, brake glow, tire smoke small, tire smoke large, skid puff, impact spark, finish celebration burst.
Effects only, no vehicle body.
Same elevated 3/4 camera and scale family as Turbo Circuit.
Each effect isolated and centered around a clearly inferable origin point.
No overlap between cells, no text, no purple neon.
```

## Top-down track tileset

```text
Create ONE production-ready 2D GAME TILESET / GAME ASSET SHEET for Turbo Circuit road tiles.
STRICT ORTHOGRAPHIC TOP-DOWN camera. Zero perspective. Zero isometric tilt.
All road tiles use exactly the same lane width, curb width, edge socket width, asphalt color and pixels-per-meter.
Strict 4 × 4 equal-cell grid with transparent background outside each road footprint.
Required tiles: straight 1-lane, straight 2-lane, start-finish, straight hazard stripe, 90° left, 90° right, wide 90° left, wide 90° right, hairpin, S-curve, T-junction, cross-junction, Y-junction, chicane left, chicane right, blank connector.
Every tile must connect seamlessly at cell edges with identical entry/exit road sockets.
Red/cream curbs, charcoal asphalt, mustard lane markings; no purple, no neon.
No scenery, no cars, no buildings, no text labels.
Production GAME ASSETS, exact reusable TILESET.
```

## Trackside props sheet

```text
Create ONE production-ready GAME ASSET SHEET for Turbo Circuit TRACKSIDE PROPS.
Strict 4 columns × 3 rows, 12 equal cells, transparent background.
Same top-down elevated 3/4 camera and same world scale across every prop.
Include: double garage, pit booth, control tower, small grandstand, large grandstand, blank billboard, tunnel portal, fuel station, marshal booth, tire service rack, track light tower, finish flag stand.
Classic arcade racing style. Clean grounded silhouettes and consistent ground-contact pivot.
No text on billboard. No logos. No unrelated objects. No purple/neon glow.
```

## Trackside environment sheet

```text
Create ONE production-ready GAME ASSET SHEET for Turbo Circuit ENVIRONMENT DECOR.
Strict 4 columns × 3 rows, equal cells, transparent background.
Same elevated 3/4 camera and scale system.
Include: round tree, pine tree, wide tree, column tree, palm tree, small tree, bush, flowering bush, spiky plant, large rock, small rocks, hay bales.
Readable arcade-game silhouettes, restrained detail, no shadows crossing cell boundaries.
No text, no background scene, no purple/neon.
```

## Hazard sheet

```text
Create ONE production-ready GAME ASSET SHEET for Turbo Circuit RACING HAZARDS.
Strict 4 columns × 3 rows, equal cells, transparent background.
Include: long red/cream barrier, short barrier, traffic cone, fallen cone, tire stack, guardrail section, warning barricade, oil spill, parking block, hazard chevron block, damaged barrier, barrel stack.
Same elevated 3/4 camera and world scale family.
Objects isolated, no overlap, no baked UI labels.
Classic arcade racing palette, no purple/neon.
```

## Pickup sheet

```text
Create ONE production-ready GAME ASSET SHEET for Turbo Circuit WORLD PICKUPS.
Strict 4 columns × 2 rows, equal cells, transparent background.
Include: nitro pickup, repair pickup, shield pickup, coin/star pickup, traction pickup, temporary speed pickup, checkpoint token, mystery pickup.
Same elevated 3/4 camera and consistent world pickup size.
Simple readable silhouettes for gameplay at small screen sizes.
No words, no logos, no purple/cyberpunk neon.
```

## Race event sheet

```text
Create ONE production-ready GAME ASSET SHEET for Turbo Circuit RACE EVENT PROPS.
Strict 3 columns × 3 rows, equal cells, transparent background.
Include: start gantry, finish gantry, inflatable arch, race scoreboard with blank screens, left-turn sign, right-turn sign, winners podium, warning sign, trophy.
Same elevated 3/4 camera and consistent style.
Any screen/sign area that will contain dynamic information must be blank and editable in code.
No baked fake text, no sponsor logos, no purple/neon.
```

## Regeneration rule

Regenerate an asset family instead of repairing it with guessed mirroring when any of these occur:

- missing required directional frame;
- camera angle changes between cells;
- lane/socket width mismatch;
- sprite crosses cell boundary;
- multiple unrelated assets fused together;
- baked text that should be dynamic;
- perspective mismatch with the target renderer;
- source contains extra shadow/effect that prevents clean compositing.
