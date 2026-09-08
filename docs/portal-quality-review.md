# Portal and game presentation review

## Scope and order

Review the shared gaming portal first, then improve all five existing cartridges. Preserve the console design, metadata-driven runtime, room pins and controls. UI means visual hierarchy; UX includes accessibility and recovery; DX and AX mean developer and agent operability.

## Findings and changes

| Axis | Observed problem | Change / acceptance |
| --- | --- | --- |
| UI | Full-width form defaults stack library filters on desktop; old cover captures crop characters | Bounded filter controls; runtime-derived landscape covers; honest missing-media fallback |
| UI | Mode labels remain white on a light card; mobile carousel hides the second choice | Semantic text color; both device choices visible in stacked mobile cards |
| UX | Preview overlaps setup and sharing compresses the stage in short landscape views | Separate 44px preview control; bounded stage height with internal scrolling |
| UX | Room-code button copies a mixed URL/text payload; rejected clipboard promise gives no feedback | Code copies only the code; shared invitation component provides native sharing, accessible success/fallback, selectable link |
| UX | Joining a protected public room only fills an offscreen field | Open the explicit room invitation/password step |
| UX | Game recommendations cannot link to a selected cartridge | Game link selects the current active release from Convex, without pinning an outdated release |
| UX | Empty search says clear filters without an action | Clear-filters action; metadata-derived player counts and modes |
| DX | Scene construction mixes HUD, models and scenery near the 200-line budget | Split scene orchestration, vehicle detail and world dressing by ownership |
| AX | Preview capture depends on obsolete UI selectors and hardcoded interaction assumptions | Per-game declarative preview scenarios, dynamic discovery, documented source/generator/artifact ownership |

## Source boundaries

- `shared/inviteLinks.ts`: URL construction and pasted room-code parsing.
- `shared/ShareLink.tsx`: clipboard/native-share recovery and feedback.
- `shared/GameCover.tsx`: portal cover presentation and missing-media fallback.
- `features/lobby`: active catalog, filtering, selection and room setup.
- `features/room`: admission, members and device-mode choice.
- `games/<id>`: gameplay, models, environments and preview scenario.
- `scripts/game-previews`: reproducible capture orchestration; never a second implementation of a game's graphics.

## Verification

Use `pnpm verify`, the isolated Compose stack and full browser multiplayer suite. Inspect desktop, portrait and landscape captures. Cover capture must load actual runtime assets and fail on browser errors. Check clipboard rejection, native-share cancellation, link selection, full-room admission, and fallback media. Exact production revision and terminal Dokploy deployment are required before reporting live completion.
