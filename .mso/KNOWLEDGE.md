# Play Together project decisions

## Operator path
- Use **MSO Fresh 3** as the default ChatGPT/MCP operator for this project.
- Use **MSO** only when a required capability is specifically better suited there.
- Do not switch to MSO Fresh 2 unless the user explicitly asks for it.

## Controller contract
- Default controller tier is always **Tier 0: left stick + ABXY + Menu/Start**.
- L1/L2/R1/R2 are **not recommended by default** and must not appear on the default mobile controller merely because the platform supports them.
- Advanced shoulder inputs are optional per-game shortcuts only when playtesting proves they add real value; the core action must remain reachable without them when practical.
- Tier 1 may add a right stick; Tier 2 may add L1/R1; Tier 3 may add L1/R1/L2/R2. Games should request the lowest tier that supports their core loop.
- Platform-owned **How To** and **Menu** actions belong in the controller surface with Start: beside Start in landscape, above Start in portrait. Do not float duplicate system buttons over gameplay on a controller/handheld screen.
- Hold controls are interaction surfaces, not selectable text: disable text selection, native drag/callout/context-menu artifacts, and preserve press ownership until pointer/key release or focus loss.

## Playable asset contract
- Do not use concept art as a substitute for runtime gameplay assets.
- A 3D playable character/rider/vehicle must use a real versioned runtime model asset, normally GLB, with a committed deterministic generator, manifest SHA-256, stable named rig when articulated, and declared required animation clips.
- A 2D playable character/object must use a spritesheet atlas plus JSON frame/pivot/animation metadata rather than unrelated standalone images.
- Menu, character-select, gameplay, result screen, and launcher preview should reuse the same runtime character identity/model family instead of maintaining a fake parallel visual source of truth.
- Debug/procedural primitives remain acceptable for environment dressing, particles, collision visualization, or bounded error fallback, but not as the normal finished playable character once that character is asset-backed.
- `pnpm assets:check` is the repository verification gate for opted-in asset configs. Changing a playable model/rig/material/spritesheet/animation requires a new immutable game version.

## Ridge Rush control grammar
- Ridge uses **stick + ABXY + Start**, no default shoulders.
- Stick horizontal = steer; vertical = rider body weight. Physical left must always read as visual-left in the chase camera.
- A = pedal; quick double-tap then hold = stamina-limited sprint.
- B = contextual brake: body forward biases front brake, body back biases rear brake, and hard steering while braking produces a powerslide.
- X = bunny hop/pump on ground; release and press again while airborne to add a directional air style from the stick. Style points bank only on clean landing.
- Y = close-range rider contact on the chosen visual side; holding body fully back while Y is held gives rear view instead of attacking.
- Ridge camera must follow the course corridor and clamp above actual procedural terrain, not just centerline elevation. Rider ground height/pitch must include lane camber so the bike never visually clips through a banked trail.

## Game direction
- Prioritize gameplay quality over catalog breadth.
- Ridge Rush should feel like an extreme mountain descent: steep cliffside sections, large vertical drops, visible valleys, strong gravity/airtime/landing physics, route choice, switchbacks, rock chutes and camera composition that sells height. Avoid a flat road with fake speed bonuses.
- Clash Arena should begin as an original 1v1 deterministic 2.5D/3D fighter with two original fighters, one arena, best-of-three rounds, spacing/timing/counterplay, stick + ABXY baseline, and no shoulder buttons by default.
- Clash Arena's current fighter identities are **Nova Rin** and **Kite Vale**; their runtime model assets, not generated concept images, are the canonical visual implementation.
- Each active 3D game should maintain readable game-specific models, camera framing, lighting/depth cues, and state-driven animation/effects; do not leave functional gameplay represented by static placeholder-like geometry when a lightweight procedural animation can communicate it.
- Do not copy licensed Downhill Domination/Tekken/Street Fighter characters, names, assets, moves, sounds or arenas; use only original designs and mechanics.

## Release policy
- Every published game version is immutable. New gameplay or asset changes mint new versions; old rooms stay pinned to their existing manifest digest.
- The user primarily tests public production, so verified main-branch deployment and production browser checks are required before calling a gameplay release complete.
