# Gameplay development and controller contract

## Current source catalogue

The source catalogue targets Turbo Circuit 0.10.1, Flight Trainer 0.3.0, Sky Strike 0.3.0, Ridge Rush 0.3.2 and Clash Arena 0.1.3. Published cartridge bytes are immutable; source versions do not prove production promotion, and existing rooms remain pinned to their exact manifest digest.

## Controller tiers

Play Together uses the lowest controller tier that supports the core loop. **Tier 0 is the default and recommendation: left stick + ABXY + Menu/Start.** Shoulder buttons are never added merely because a console has them.

| Tier | Inputs | Policy |
| --- | --- | --- |
| 0 | left stick + ABXY + Menu/Start | default for mobile and new games |
| 1 | Tier 0 + right stick | only for continuous second-axis control |
| 2 | Tier 1 + L1/R1 | optional advanced actions after playtesting |
| 3 | Tier 2 + L2/R2 | exceptional complex games only |

Existing older cartridges may still expose shoulder actions; that history is not the default for new design. If an advanced shoulder action is only a shortcut, the core mechanic should remain reachable through Tier 0 where practical.

| Game | Tier 0 core | Extra controls in current release |
| --- | --- | --- |
| Turbo Circuit | steer + A gas / B brake / X item / Y rear | legacy L1/R1/L2/R2 advanced actions |
| Flight Trainer | flight stick + ABXY aircraft actions | legacy shoulder rudder/brake/assist |
| Sky Strike | flight stick + ABXY combat/throttle | legacy shoulder rudder/airbrake/boost |
| Ridge Rush 0.3.2 | steer/body stick + A pedal / B brake / X jump / Y rear | none |
| Clash Arena 0.1.3 | movement/guard stick + A jab / B kick / X launch-or-low / Y meter Surge | none |

### Ridge Rush keyboard

Arrows/WASD steer and shift body weight, Space pedals, Shift brakes, X jumps/pumps, Y holds rear view, Enter readies/rematches. Forward body weight doubles as an aerodynamic tuck at speed; no shoulder shortcut is required.

### Clash Arena keyboard

Arrows/WASD move. Hold away to high guard; crouch-away guards low. J is A/jab, K is B/kick, L is X/launcher (crouch + X becomes a low sweep), I is Y/meter Surge, and Enter requests a rematch after the match. A+B together forms a throw and also escapes an incoming throw.

### Physical gamepad

Standard-mapped browser gamepads retain radial stick deadzones and safe focus/disconnect cleanup. Unknown mappings are ignored rather than guessed. Games that only declare Tier 0 do not render shoulder buttons on mobile even though a physical pad may have them.

## Ridge Rush 0.3.2

Ridge Rush is an original 1–4 player extreme mountain-bike descent. The 3.6 km course drops about **980 m** from start to finish, opens with sustained 30–50° chutes, contains multiple later 25°+ sectors, a real local climb, cliffside singletrack, off-camber sections, rock/snow/mud/dirt grip changes, a narrow shortcut, natural drop lips, ramps and deterministic AI riders.

The authoritative bike simulation tracks forward and lateral velocity, altitude, vertical velocity, grounded state, pitch, front/rear suspension compression, stamina and surface grip. Downhill acceleration uses the gravity component along the trail; airborne motion uses 9.81 m/s² until terrain contact. Fast terrain fall-away can launch the bike without pressing jump. Landing risk depends on vertical impact, bike pitch relative to the landing slope, lean and body position. Front/rear terrain probes drive pitch and suspension response.

The renderer uses an actual procedural mountain mesh rather than a flat road ribbon. Cliff-side terrain can fall more than 100 m below the trail, opposite walls rise around chutes, trail camber is visible, and the chase camera keeps the local rider as the anchor while speed/grade influence FOV. The visuals are original low-poly geometry; no reference-game characters, courses, branding, audio or art are reused.

## Clash Arena 0.1.3

Clash Arena is an original deterministic 1v1 arena fighter with two original fighters, **Nova Rin** and **Kite Vale**, one procedural arena, a 60-second round clock and best-of-three match flow. A solo player receives a deterministic CPU opponent; a second human can occupy the other fighter slot.

The first combat slice implements spacing, high/low hold-away guard, jab, kick, crouching low sweep, launcher, bounded airborne juggle with damage scaling, A+B throw and throw escape, hit-stun/block-stun, an eight-frame input buffer, meter gain/spend and a meter Surge. Stunned fighters cannot act until recovery, juggles stop after two follow-up hits, and timeout draws/health advantages resolve deterministically.

This is not marketed as a competitive rollback fighter yet. Prediction/rollback, larger move lists and character-specific stance systems remain later work after the local/server-authoritative duel is proven responsive.

## Verification

Run the normal repository gates before release:

```sh
pnpm verify
pnpm test:gameplay-controls
```

The controller browser harness starts an isolated loopback Vite server, renders actual controller modules and CSS in Chromium, verifies 320×568, 360×800, 844×390 and 1280×720 in both remote and handheld modes, and checks input aliases, opposing shoulders and focus loss. Its reports/screenshots are stored under ignored `.local/gameplay-controls-qa/`. It does not authenticate against production or substitute for room-join/reconnect E2E.

Before production promotion, run the local-stack room E2E suite and verify newly published manifest SHA-256 values through the live catalogue. Do not silently upgrade in-progress rooms. Longer multiplayer sessions, mobile thermal throttling and real controller ergonomics remain manual playtest work.

## Optional later party game: Sky Rescue

A cooperative rescue route could reuse aircraft presentation expertise while giving players a different goal: pilot through checkpoints while a teammate handles rescue timing or navigation. Prototype shared objectives and role clarity first. Prioritize a polished Ridge Rush and Clash Arena slice over adding several shallow catalogue entries.

## Primary references

- W3C Gamepad specification: https://www.w3.org/TR/gamepad/
- Bandai Namco, TEKKEN 8 introductory guide (four basic limb attacks as a design reference, not licensed assets): https://en.bandainamcoent.eu/tekken/news/tekken-8-the-guide-start-playing
