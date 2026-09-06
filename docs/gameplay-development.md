# Gameplay development and controller contract

## Current source catalogue

The source catalogue targets Turbo Circuit 0.11.0, Flight Trainer 0.4.0, Sky Strike 0.4.0, Ridge Rush 0.5.6 and Clash Arena 0.2.0. Published cartridge bytes are immutable; source versions do not prove production promotion, and existing rooms remain pinned to their exact manifest digest.

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
| Ridge Rush 0.5.6 | stick steer/body + A pedal/sprint / B brake/slide / X hop/trick / Y attack/look | none |
| Clash Arena 0.2.0 | movement/guard stick + A jab / B kick / X launch-or-low / Y meter Surge | none |


### Shared system actions and hold behavior

The frame owns **How To** and **Menu** next to Start instead of duplicating floating gameplay chrome. Landscape lays these actions beside Start; portrait stacks them above Start. The How To sheet is generated from the manifest so it stays game-specific. Shoulder shortcuts remain hidden until the user explicitly reveals advanced controls. Hold controls disable selection, drag, context-menu and touch-callout browser behavior while preserving pointer/key ownership until release or focus loss.

### Ridge Rush keyboard

Arrows/WASD steer and shift body weight. Space pedals; quick double-tap then hold activates a stamina-limited sprint. Shift brakes: body-forward biases the front brake, body-back biases the rear brake, and hard steering while braking produces a powerslide. X bunny-hops/pumps on the ground; after releasing it, another X press in the air adds a directional style from the stick. Y attacks a nearby rival on the chosen side; holding the body fully back while Y is held switches to rear view. Enter readies/rematches. No shoulder shortcut is required.

### Clash Arena keyboard

Arrows/WASD move. Hold away to high guard; crouch-away guards low. J is A/jab, K is B/kick, L is X/launcher (crouch + X becomes a low sweep), I is Y/meter Surge, and Enter requests a rematch after the match. A+B together forms a throw and also escapes an incoming throw.

### Physical gamepad

Standard-mapped browser gamepads retain radial stick deadzones and safe focus/disconnect cleanup. Unknown mappings are ignored rather than guessed. Games that only declare Tier 0 do not render shoulder buttons on mobile even though a physical pad may have them.

## Ridge Rush 0.5.6

Ridge Rush is an original 1–4 player extreme mountain-bike descent. The 3.6 km course drops about **980 m** from start to finish, opens with sustained 30–50° chutes, contains multiple later 25°+ sectors, a real local climb, cliffside singletrack, off-camber sections, rock/snow/mud/dirt grip changes, a narrow shortcut, natural drop lips, ramps and deterministic AI riders.

The authoritative bike simulation tracks forward and lateral velocity, altitude, vertical velocity, grounded state, pitch, front/rear suspension compression, stamina and surface grip. Downhill acceleration uses the gravity component along the trail; airborne motion uses 9.81 m/s² until terrain contact. Fast terrain fall-away can launch the bike without pressing jump. Landing risk depends on vertical impact, bike pitch relative to the landing slope, lean and body position. Front/rear terrain probes drive pitch and suspension response.

The renderer uses an actual procedural mountain mesh rather than a flat road ribbon. Cliff-side terrain can fall more than 100 m below the trail, opposite walls rise around chutes, trail camber is visible, and the chase camera keeps the local rider as the anchor while speed/grade influence FOV. The visuals are original low-poly geometry; no reference-game characters, courses, branding, audio or art are reused.

Ridge Rush 0.5.6 also fixes the controller/camera conventions exposed by real handheld playtesting. Left input now maps to visual-left motion in the chase camera. Rider ground height follows lane camber rather than the trail center plane, and the chase camera follows the course corridor and clamps above the actual procedural terrain so it cannot tunnel beneath a cliff mesh. The control grammar borrows genre ideas rather than licensed content: PS1-era downhill racers used stick steering, pedal, trick and separate front/rear braking, while Downhill Domination used stick lean/steer, pedal, double-tap sprint, bunny hop, braking/powerslide, combat, camera/look-back and airborne tricks. Ridge Rush compresses those ideas into Tier 0 stick+ABXY context actions instead of exposing L1/L2/R1/R2 on mobile.

## Clash Arena 0.2.0

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
- No Fear Downhill Mountain Biking (PS1) basic control reference: https://psxdatacenter.com/games/U/N/SLUS-01000.html
- Downhill Domination (PS2) control reference: https://gamefaqs.gamespot.com/ps2/914603-downhill-domination/faqs/24810
- Downhill Domination PAL control/trick reference: https://psxdatacenter.com/psx2/games2/SLES-52202.html
- Bandai Namco, TEKKEN 8 introductory guide (four basic limb attacks as a design reference, not licensed assets): https://en.bandainamcoent.eu/tekken/news/tekken-8-the-guide-start-playing
