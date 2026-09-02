# Casa Dezian MarioKart audit — Turbo Circuit 0.9.1

Reference repository: `casadezian/mariocart` at `f180afdfc7a00218a9761bbf7690b2e083898f02`.

The source repository contains no binary `.glb`, `.gltf`, `.fbx`, `.obj`, texture-image, `.mp3`, `.wav`, or `.ogg` game assets. Its cars, track presentation, surface textures, effects, and game sounds are generated procedurally in TypeScript/Three.js/Web Audio. Turbo Circuit therefore re-authors the reusable neutral systems inside the Play Together SDK instead of importing a second application stack.

## Adaptation matrix

| Source capability | Turbo Circuit 0.9.1 | Decision |
| --- | --- | --- |
| Sawtooth engine oscillator + low-pass filter | Dynamic engine pitch/gain from authoritative kart speed | Adapted |
| Countdown/start tones | 3-2-1 and race-start synthesis | Adapted |
| Coin sound | Procedural pickup sequence | Adapted |
| Item-box / roulette sounds | Item acquisition arpeggio + roulette ticks | Adapted |
| Boost sound | Frequency sweep + speed-line feedback | Adapted |
| Projectile sound | Generic `PULSE` fire cue | Adapted |
| Hazard-drop sound | Generic `MINE` drop cue | Adapted |
| Crash / spin sounds | Noise burst + spin sequence | Adapted |
| Wrong-way warning | Server hysteresis + repeating alert | Adapted |
| Drift spark sounds | Tier I / Tier II mini-turbo cues | Adapted |
| Slipstream sound | Draft-to-boost cue | Adapted |
| Wall hit / scrape sounds | Impact burst + scrape noise | Adapted |
| Rescue sound | Generic rescue arpeggio | Adapted |
| Finish sound | Procedural finish fanfare | Adapted |
| Procedural asphalt color/normal/roughness maps | Deterministic Canvas-derived road maps | Adapted |
| Procedural terrain texture | Deterministic ground color/normal/roughness maps | Adapted |
| Chassis / nose / spoiler | True 3D geometry for every Play Together kart | Adapted |
| Exhaust pipes / boost flames | Dual exhaust + animated boost flame | Adapted |
| Four wheels / rims | 3D wheels with spin and front steering | Adapted |
| Driver model | Generic helmeted driver, no Nintendo character identity | Adapted |
| Steering wheel | 3D steering wheel + existing driver-view cockpit HUD | Adapted |
| Drift spark meshes | Tier-colored animated 3D sparks | Adapted |
| Kart lean / steer animation | Chassis roll, wheel steer and wheel rotation | Adapted |
| Hit blinking / temporary immunity | Authoritative 2.8-second invulnerability + renderer blink | Adapted |
| Coin loss on hit | Up to two coins lost on item collision | Adapted |
| Smooth wall collision | Server-authoritative corridor clamp + wall glide | Adapted |
| Bouncing shell behavior | Generic `PULSE`, maximum four barrier bounces | Adapted |
| Stationary banana behavior | Generic `MINE`, no Nintendo identity | Adapted |
| Slipstream / drafting | Server-authoritative drafting and boost | Adapted |
| CPU catch-up behavior | Bounded rubber-banding around human race progress | Adapted |
| Post-race restart flow | All human racers ready before authoritative rematch countdown | Adapted |
| Wrong-way detection | Sustained reverse-alignment state from server | Adapted |
| Boost pads | Authoritative boost + animated procedural chevrons | Adapted |
| Floating coins/item boxes | Bobbing and rotating 3D pickups | Adapted |
| Start/finish marquee | Generic `TURBO CIRCUIT` 3D marquee | Adapted |
| Guardrails / tire barriers | Procedural posts, rails and tire barriers | Adapted |
| Minimap | Track, racers, boost, item and coin feature markers plus accessible expandable map | Expanded |
| Speed lines / item roulette / drift callout | Procedural CSS effects | Adapted |
| Finish confetti | Deterministic CSS confetti | Adapted |
| Dynamic high-speed FOV / camera shake | Snapshot-driven boost, spin and high-speed camera motion | Adapted |
| Invulnerability recovery banner | Shield countdown plus renderer blinking | Adapted |
| Start-gate bulbs / neon barrier trim | Procedural emissive geometry on the shared Three.js surface | Adapted |
| PointLight-heavy lighting and large shadow maps | Existing directional/hemisphere lighting plus emissive accents | Simplified intentionally: preserves the shared Three ABI and mobile GPU budget |
| Main Grand Prix waypoint loop | Already represented by the scaled/recentered `Neo Metro Circuit` layout | Already adapted |
| Tokyo / Rainbow / Sunset themes | Re-authored as Neo Metro / Cosmic Loop / Sunset Dunes | Adapted |
| Mario/Bowser/Peach/Yoshi/Toad/Donkey Kong identities | Not shipped | Excluded: Nintendo IP |
| `MARIO KART` sign and Nintendo item names/art | Not shipped | Excluded: Nintendo IP |
| Gemini AI voice panel/server | Not shipped | Excluded: provider-specific application feature |
| React/Express application shell | Not shipped | Excluded: Play Together already provides shell/realtime/runtime |

## Architecture boundary

Gameplay truth remains server-authoritative. The display reads validated snapshots for audio and effects; it does not calculate outcomes. Three.js remains the shared immutable `three@0.185.1+pt1` engine surface used by the aircraft games as well, so the richer kart renderer does not add a second Three.js payload.

Browser autoplay rules are respected: controller gestures unlock Web Audio on handheld devices, while the in-game `SOUND ON/OFF` control provides an explicit unlock/mute surface for shared displays.
