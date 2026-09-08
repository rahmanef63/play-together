# Turbo Circuit and console review — 0.25.0

The owner's manual feedback identified failures missed by the earlier non-empty-canvas checks. This release prioritizes track visibility, authoritative game rules, console usability and rendering cost.

## Findings and changes

| Area | Observed defect | Change |
| --- | --- | --- |
| Landscape shell | Percentage-based side rails narrowed the game; system actions overlaid the racing HUD | Bounded thumb rails and a separate 44px Start/How To/Menu row |
| Control labels | Absolutely positioned action labels escaped their buttons and piled up at the chassis edge | Position labels relative to their own button; compact handheld uses ABXY with the full mapping in How To |
| Turbo setup | 320px minimum height and viewport-based card widths exceeded the nested game screen | Container-relative dimensions, compact cards and scrollable setup/results |
| Race visibility | Large speed dial, duplicate item slots and continuous effects covered the driving view | Compact speed/item readouts, one item indicator, no continuous overlay effects |
| Console actions | Drift and rescue required hidden shoulders | B + steering drifts; holding B one second while stopped rescues |
| Finish logic | Last checkpoint incremented laps before the finish line | Ordered checkpoints plus a forward finish-line crossing; consistent standings on the final segment |
| Track interaction | Circular boost activation disagreed with the visible rectangle | Shared dimensions and oriented rectangle activation |
| Scene lifecycle | Removed pickups survived track changes | Snapshot membership reconciliation and owned GPU cleanup |
| Environment | Hundreds of separate static draw calls; gantry board obstructed the horizon | Spatial/material batching and a higher start gantry |
| Render loop | HUD, hidden garage, membership changes and effects repeated every frame | HUD at 10Hz, membership on snapshots, hidden-page early return and a bounded pixel budget |
| Publication | Invalid controller metadata could enter the local immutable catalog before validation | Validate the manifest schema before publishing any release bytes |

## Verification

The isolated browser suite covers all five game manifests in remote and handheld modes, touch hold/release, focus cleanup, actual game canvases, compact setup/HUD bounds and console-to-authoritative-server actions. Its viewport matrix includes 667×280 and 740×320 to represent reduced landscape browser space, as well as 844×390 and 915×412.

The Turbo flow exercises car/track selection, ready/countdown, tap-to-cruise, braking, recovery, rear view and pause. Full-stack browser verification repeats compact screen checks through the actual sandboxed iframe and realtime gateway. CI now runs the expanded console suite before multiplayer scenarios.

Reference scenery measurements use the same camera and scene before and after batching:

| Circuit | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Neo Metro | 602 draw calls | 113 | 81.2% |
| Cosmic Loop | 638 | 90 | 85.9% |
| Sunset Dunes | 590 | 88 | 85.1% |

These numbers measure static scenery submission cost, not whole-game FPS on a physical phone. Spatial batching can include a few additional triangles at a frustum edge. The renderer caps each display at 900,000 pixels and 1.5 DPR; actual phone performance still depends on GPU and browser.

The refreshed Turbo cover/clip comes from a deterministic authoritative driving scenario that maintains speed while following the course. Existing rooms remain pinned to their original game version. New Turbo rooms use 0.12.1.
