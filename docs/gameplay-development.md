# Gameplay development and controller contract

## Scope of the September 2026 gameplay pass

The source catalogue targets Turbo Circuit 0.10.0, Flight Trainer 0.3.0 and Sky Strike 0.3.0. These are new immutable release identities, not edits to previously published cartridges. A source version does not prove that production has deployed it. Existing rooms remain pinned to their original manifest digest.

This pass improves the three current games. The downhill and fighting concepts below are proposals, not playable catalogue entries. Do not add placeholder game cards or market them as shipped.

## Shared controls

Controllers are described by the cartridge manifest. Simple cartridges only show the controls they declare; complex cartridges may use all four shoulder positions. The host must not infer actions from a game ID.

| Game | A / B / X / Y | L1 | R1 | L2 | R2 | Start |
| --- | --- | --- | --- | --- | --- | --- |
| Turbo Circuit | Gas / Brake / Forward item / Rear view | Camera | Drift | Rescue | Backward item | Ready, pause, rematch |
| Flight Trainer | Flaps / Gear / Throttle down / Throttle up | Left rudder | Right rudder | Brake | Level assist | Restart from runway |
| Sky Strike | Cannon / Missile / Throttle down / Throttle up | Left rudder | Right rudder | Airbrake | Afterburner | Not declared |

Turbo Circuit keeps its explicit hold-to-drive contract: A is gas, B is brake, X is the item and Y is rear view. Boost force requires gas and is suppressed while braking. Shoulder buttons do not remap A or B into trigger pedals.

Touch controls show both the shoulder glyph and its action. Remote portrait reserves a dedicated shoulder row below the status panel. Handheld mode retains the game screen, rather than replacing it with a remote status dashboard.

### Keyboard

Turbo: arrows/WASD steer and select in the garage, W/up gas, S/down brake, Space/Enter/F forward item, R rear view, C camera, Shift drift, Backspace rescue, V backward item, G/P/Escape Start.

Flight Trainer: arrows/WASD yoke, Q/E rudder, F flaps, G gear, minus/equal throttle, Space brake, Shift level assist, R restart.

Sky Strike: arrows/WASD flight stick, Q/E rudder, Space cannon, Shift missile, minus/equal throttle, Z airbrake, C afterburner.

### Physical gamepad

Standard-mapped browser gamepads use face indices 0–3, shoulders 4–7 and Start 9. Stick deadzone is radial, finite input is normalized, and directional-pad input can drive the primary stick. Unknown mappings are ignored instead of guessed.

L2/R2 are currently digital actions at a 0.5 trigger-value threshold; continuous analog trigger bindings are not implemented. A connected or refocused pad must return to neutral before controls react. Actual Xbox/PlayStation hardware and mobile Bluetooth combinations still require device testing; synthetic adapter tests are not hardware certification.

The input lifecycle owns each keyboard alias, pointer and gamepad source independently. Releasing one finger or alias does not cancel another held source. Blur, hidden tabs, controller disposal and pad disconnection release active inputs. Pending pulse timers are cancelled when a controller unmounts.

## Game-specific changes

### Turbo Circuit

Reject malformed numeric patches, including NaN and infinity, before mutating control state. Boost adds force only while gas is held and the brake is released. Wall correction no longer injects a minimum speed into a stopped kart. Drift, rescue, camera changes and backward item use are reachable through shoulder controls.

### Flight Trainer

Zero throttle no longer produces idle taxi movement. Ground contact remembers airborne state across low-height frames, so a gentle touchdown is still evaluated. Safe landing requires runway alignment, landing gear, limited descent speed, low airspeed and stable attitude. Landing score cannot be farmed by repeated contact. Passing the last checkpoint requests a return to the runway; mission completion requires a safe landing. Restart resets the flight and controller defaults. Brake and level assist are held actions.

### Sky Strike

Projectile collision checks the travelled segment and resolves the nearest intersection, rather than testing only the endpoint or the first plane in an array. Expired projectiles and protected respawns cannot score hits. Round resets distribute aircraft into separate slots. Short spawn protection, fuel-limited afterburner, airbrake priority, missile cooldown, respawn countdown and round-result countdown make combat state explicit.

## Verification

Run the normal repository gates before release:

```sh
pnpm verify
pnpm test:gameplay-controls
```

The controller browser harness starts an isolated loopback Vite server, renders actual controller modules and CSS in Chromium, verifies 320×568, 360×800, 844×390 and 1280×720 in both remote and handheld modes, and checks input aliases, opposing shoulders and focus loss. Its reports/screenshots are stored under ignored `.local/gameplay-controls-qa/`. It does not authenticate against production or substitute for room-join/reconnect E2E.

Before production promotion, run the local-stack room E2E suite and verify newly published manifest SHA-256 values through the live catalogue. Do not silently upgrade in-progress rooms. Longer multiplayer sessions, mobile thermal throttling and real controller ergonomics remain manual playtest work.

## Proposed next cartridge: Ridge Rush

Working title only. An original downhill bicycle race for 2–4 players, with a short point-to-point mountain route rather than another kart circuit. Keep the excitement of steep descents, route choice and risky overtakes without borrowing another game's characters, names, sounds or course assets.

The first playable slice should contain one well-tuned course, AI opponents for solo testing, bicycle braking and grip, stamina-limited pedalling/sprinting, weight shifting, small jumps, checkpoint rescue, finish order and rematch. A shortcut must trade time saved against a measurable handling risk. Landings need predictable feedback before adding elaborate tricks.

Proposed controls: left stick steering/lean; A pedal; B brake; X jump/pump; Y rear view; L1/R1 weight shift; L2 tuck; R2 stamina-limited sprint; Start pause/ready. Treat this as a playtest hypothesis, not a frozen mapping. Avoid requiring more than two simultaneous touch actions for basic racing.

Acceptance: a full race can be started, finished and replayed; AI can finish the route; checkpoint order prevents skipping; crashes restore the bicycle to a safe checkpoint; four players have stable frame pacing; the remote shows course progress, speed and stamina. Reuse platform rooms, input and release infrastructure, but keep bicycle physics in its own cartridge.

## Proposed following cartridge: Clash Arena

Working title only. Start with an original 1v1 2.5D martial-arts duel: two characters, one arena, visible range, guard and a small set of deliberate attacks. Do not promise a full competitive 3D fighting game before the core duel is responsive.

The initial mechanics should include four limb attacks, throw/throw escape, guard, recovery time, hit and hurt regions, hit-stun, a small input buffer, best-of-three rounds and rematch. Proposed shoulders: L1 guard, R1 throw, L2 sidestep/dodge, R2 a meter-limited special. Each action needs a readable counter; shoulder controls must not become an automatic unbeatable combo button.

Acceptance: one input produces one bounded action; simultaneous contacts resolve consistently; throws and specials have clear counters; round timers and ties have defined outcomes; neither player can act while in hit-stun; two-player LAN sessions are tested before competitive internet claims. Network prediction/rollback is future engineering work, not implemented by this gameplay pass.

## Optional later party game: Sky Rescue

A cooperative rescue route could reuse aircraft presentation expertise while giving players a different goal: pilot through checkpoints while a teammate handles rescue timing or navigation. Prototype shared objectives and role clarity first. Prioritize a polished Ridge Rush and Clash Arena slice over adding several shallow catalogue entries.

## Primary references

- W3C Gamepad specification: https://www.w3.org/TR/gamepad/
- Bandai Namco, TEKKEN 8 introductory guide (four basic limb attacks as a design reference, not licensed assets): https://en.bandainamcoent.eu/tekken/news/tekken-8-the-guide-start-playing
