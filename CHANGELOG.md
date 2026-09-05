# Changelog

All notable changes to Play Together are documented here. The project follows semantic versioning for the platform and immutable semantic versions for each game release.

## [0.16.0] - 2026-09-05

### Phone pairing

- Add an explicit rear-camera QR scanner and local image decoding fallback. Camera streams stop after a read, cancellation, hidden tab or unmount. No microphone, recording, image upload or automatic navigation from scanned content.
- Share phone-safe code parsing between browser and backend. Accept ordinary/smart dashes, whitespace, lowercase and full-width characters without truncating an eight-character code to a nine-character raw input budget.
- Separate session/network/rate-limit errors from expired requests, reject foreign and room-invite QR URLs, and bind consent to the code actually reviewed. Successful review becomes an explicit focused confirmation step.

### Interface

- Replace the rejected blue card stack with a silver-console launcher: real game viewport, cartridge selector and a plain setup column. Mobile separates the game library and setup task without adding a modal or page-level scroll.
- Apply reviewed Taste Redesign, Impeccable craft/Operate and Anthropic frontend-design guidance. Keep product/design decisions in PRODUCT.md and DESIGN.md. Remove superseded lobby styles instead of retaining competing overrides.
- Self-host Barlow Condensed for the boot wordmark and game titles. Keep runtime controls in the system UI font. Third-party asset licenses are served under /licenses.

## [0.15.1] - 2026-09-05

- Add the public `/device` SPA deep-link rewrite required when opening a QR URL from another device. Test every fixed App route against Vercel configuration.
- Keep TV diagnostics within the reviewed `/embed` namespace when opened from an embedded screen.

## [0.15.0] - 2026-09-05

### Added

- Proof-bound QR sign-in with authenticated device review, explicit consent, decline, five-minute expiry, allocation/polling limits, one-time transactional consumption and bounded expiry cleanup.
- Shared accessible toast notifications with concise messages, recovery actions, dismiss controls, collapsed diagnostic details and duplicate suppression.
- Original console-inspired single-viewport home with selected-game artwork, a horizontal game library, Play/Rooms tabs, focused room controls and keyboard/TV-remote navigation.
- A lightweight classic-script boot fallback and standalone `/tv.html` diagnostics. The shell targets Chrome 79-era syntax with selected platform polyfills and a `100vh` fallback. Display mode checks current game-engine syntax and WebGL 2 separately.

### Safety and compatibility

- QR codes contain a public approval code, never a session token or requester proof. Scanning/reviewing is not approval. Existing game releases remain immutable.
- Current 3D cartridges still require their ES2022/WebGL 2 runtime. Older TV hardware is not certified by changing a browser user agent. Unsupported devices receive an explanation and safe alternatives rather than disabled security checks.
- One-screen UI keeps long forms/lists in deliberate inner scroll regions, including short mobile viewports and virtual keyboard layouts.

## [0.14.5] - 2026-09-05

### Fixed

- Normalize the real configured password authorizer before Convex Auth materialization. The SDK factory stores its implementation in `options`; wrapping the top-level placeholder alone was overwritten during configuration. Regression tests now pass the wrapped provider through the actual pinned SDK materializer, preserving validation, crypto, rate limiting and successful authorization.

## [0.14.4] - 2026-09-05

### Fixed

- Embedded Google login no longer redirects its iframe into Google. It highlights the reviewed MSO host action; an explicit host-side button opens Google login in a browser tab. Older widgets fall back to Open production. Browser and embedded sessions are explicitly separate.
- Password-provider failures use safe public codes for invalid credentials, rate limits, validation, account-linking restrictions and service failures. Unknown exceptions are not labelled as bad passwords.
- Authentication UI uses allowlisted messages and preserves a bounded support reference instead of displaying raw Convex errors, server traces or OAuth URLs.
- Rejected or cancelled OAuth callbacks remove callback parameters, show recovery actions and do not leave an unhandled promise or endless sign-in spinner.

## [0.14.3] - 2026-09-05

### Fixed

- Dedicated `/embed` routes now accept app-scoped HTTPS subdomains of `web-sandbox.oaiusercontent.com`, not only its apex hostname. The normal app and game-frame routes retain their anti-framing policy.
- The embedded app sends its constant, public ready marker to its immediate parent instead of assuming the parent's runtime origin equals the domain declared in MCP metadata. The MSO receiver still validates source window and exact game origin; no credentials or player state are sent.
- Browser regression coverage now uses the actual readiness module and exercises direct MSO, base sandbox, app-specific sandbox, lookalike hosts and unreviewed ancestor chains. CI runs this check before room E2E.

## [0.14.2] - 2026-09-05

- Turbo Circuit 0.10.1 keeps the sound toggle responsive even when browser audio activation is pending; audio permission is explicitly delegated to the sandboxed game frame.
- Fixed Node 22 JSON import attributes in the E2E manifest-driven cartridge selectors.

## [0.14.1] - 2026-09-05

### Fixed

- Dedicated `/embed` routes now allow the complete reviewed ChatGPT sandbox → MSO → game ancestor chain; the ordinary application keeps its anti-framing policy.
- Nested game frames keep the `/embed/game-frame.html` path and resolve to the actual sandbox document instead of the application shell.
- The React app emits a minimal exact-parent readiness message after the auth/lobby shell is usable; it contains no account or room data.
- Local HTTP and Vercel embed policies are covered by regression tests, including a real browser allowed-chain/refused-chain check.
- E2E cartridge selection now follows source manifests and verifies the new shoulder controls rather than expecting retired layouts.

## [0.14.0] - 2026-09-05

### Gameplay and controls

- Added standard-mapped physical gamepad input, L1/L2/R1/R2 actions and labelled shoulder rows. Trigger actions are digital at a 0.5 threshold.
- Fixed keyboard aliases, simultaneous touch ownership, opposing controls, focus/disconnect cleanup and stale pulse timers.
- Turbo Circuit 0.10.0: gas-gated boost, brake priority, no minimum wall speed, finite input validation and advanced shoulder actions.
- Flight Trainer 0.3.0: idle movement, persistent landing checks, safe-landing mission completion, duplicate landing score, restart, brake and level assist.
- Sky Strike 0.3.0: swept projectile collision, nearest-target resolution, protected and separated respawns, fuel-limited boost, airbrake and round/respawn HUD.
- Added simulation regressions and a real-browser controller layout/input harness; split responsive styling and telemetry by ownership.
- Documented original downhill and fighting proposals, explicitly not shipped cartridges.

### Release policy

New cartridge identities preserve previous immutable releases and in-progress room pins. Production promotion is verified separately from source builds.

## Historical development notes (Turbo Circuit 0.5.1, superseded)

These earlier notes describe a retired control experiment. Current Turbo Circuit uses held A gas, B brake, X item and Y rear view.


### Added

- Turbo Circuit `0.5.1` upgrades the racer into a PS1-inspired couple mode with a cartridge-owned garage for circuit/car selection, three circuit layouts, three handling profiles, dynamic minimap, analog/numeric speedometer, lap/position/timer HUD, chase/driver cameras, wrong-way feedback, and finish results.
- CPU rivals now drive the same authoritative racing-line geometry as players and use seeded, low-frequency logistic-chaos targets for bounded variation in lane choice, pace, mistakes, and nitro timing without frame-to-frame random jitter.

### Changed

- Turbo Circuit mobile input is now two-thumb friendly: `GO` is pressed once to latch auto-throttle, `BRAKE` and `BOOST` remain direct controls, `VIEW` toggles the camera, and continuous `GAS`/throttle input has been removed. Boost works whenever the car is already moving and no longer depends on holding gas.
- Turbo Circuit `0.5.0` is retained as an immutable intermediate release; `0.5.1` is the refined release with smoothed CPU chaos, garage stat bars, race timer, and results board.

## [0.11.9] - 2026-09-01

### Added

- Added an immediate live-session emergency kill-switch for exact `blocked` game releases. Realtime instances hydrate a Redis blocked-release mirror, subscribe to release-control events, send a fatal `RELEASE_BLOCKED` message, and close already-open affected sockets with code `4003`; unrelated releases and `retired` pinned rooms continue normally.
- Added bounded, fixed-cardinality runtime observability for active sessions/connections, worker tick timing, generated snapshots, worker/game/coordination failures, browser frame timing, WebSocket RTT, and release-revocation counts. Instance samples are exposed through realtime health, surfaced in `/ops`, and emitted as structured `realtime_metrics` logs while rooms are active.

### Changed

- Managed game registration now reconciles the Redis release-control mirror after the durable Convex policy update and fails closed when production release control is required but unavailable. Redis set mutation plus Pub/Sub notification is atomic, and realtime session creation re-checks blocked policy across asynchronous module/coordinator startup boundaries.
- Managed deployment now waits for `coordination: distributed`, `releaseControl: ready`, and observability schema v1 before registering games or running production browser scenarios.
- Split validated heartbeat/input routing into the dedicated `RoomSessionProtocol` owner so `RoomSession` remains a thin orchestrator under the architecture budget.

### Privacy

- Runtime performance telemetry is aggregate and bounded; it does not store player IDs, room IDs, or game IDs. Browser samples piggyback on existing heartbeats, are throttled per connection, and do not add a separate telemetry request stream.

## [0.11.8] - 2026-09-01

### Added

- Added immutable release lifecycle policy with `active`, `retired`, and emergency `blocked` states plus the bounded `game.release_status` / `game_release_status` tool. Retired releases stop new room creation while existing exact-SHA pinned rooms remain playable; blocked releases deny new tickets too.
- Added selected-game runtime preflight and SHA-verified prefetch for display/controller bundles and shared engine vendors.

### Changed

- Latest playable release selection now follows semantic-version precedence instead of publication timestamp/lexicographic ordering.
- Verified resource caches are bounded and the web initial chunk now has both raw and gzip performance budgets.
- Developer tool documentation is generated from the same tool-definition SSOT instead of a handwritten UI list.
- Retired the intermediate Turbo Circuit `0.5.2`, Sky Strike `0.2.5`, and Flight Trainer `0.2.5` host policies while preserving their immutable bytes.

## [0.11.7] - 2026-09-01

### Fixed

- Added explicit managed Vercel CORS/CORP and one-year immutable cache headers for versioned `/engine-vendors/*` assets, matching the local server and allowing the SHA-pinned shared runtime to stay hot in browser/CDN cache.

## [0.11.6] - 2026-09-01

### Changed

- Consolidated live game discovery and display presentation around the Convex catalog plus SHA-pinned immutable manifests; `game-registry.json` is now tooling-only at runtime.
- Removed game/action-ID knowledge from the controller engine. Racing/flight remain reusable semantic shell presets rather than game-specific branches.
- Added fixed, SHA-pinned engine-vendor ABI surfaces. Turbo Circuit `0.5.3`, Sky Strike `0.2.6`, and Flight Trainer `0.2.6` share `three@0.185.1+pt1` instead of bundling Three.js independently.
- Made gameplay preview capture discovery-driven so game/version/player requirements come from game slices instead of hardcoded action scripts.

### Performance

- Reduced the combined raw display payload for the three current 3D cartridges from about 1.63 MB to about 573 KB; combined gzip payload drops from about 415 KB to about 150 KB while keeping SHA verification.
- Verified manifests, modules, assets, and shared runtime vendors now reuse immutable browser caching by URL + SHA instead of forcing repeated `no-store` downloads.

## [0.11.5] - 2026-09-01

### Fixed

- Added an 8-second WebSocket handshake watchdog so a stalled production realtime connection is closed and retried with a refreshed ticket instead of remaining in `connecting` indefinitely.
- Added browser-runtime regression coverage for a WebSocket that never reaches `open`, preserving bounded reconnect behavior without weakening production E2E expectations.

## [0.11.4] - 2026-08-31

### Changed

- Refactored the web, frame runtime, Convex rooms/templates, realtime room runtime, public contracts/runtime packages, game-admin tooling, E2E scenarios, and the three advanced game cartridges into explicit vertical ownership slices with maintained implementation files capped at 200 lines.
- Replaced monolithic app/frame stylesheets with feature-owned styles and shared semantic custom-property tokens while isolating legacy compatibility overrides.
- Added architecture enforcement for line budget, feature dependency direction, shared/frame boundaries, and game isolation.
- Added concise agent onboarding and task-routing docs; the game-submission AI prompt is now one canonical SSOT consumed by docs sync, `/developers`, MCP, and MSO project tools.
- Turbo Circuit `0.4.1`, Sky Strike `0.2.4`, and Flight Trainer `0.2.4` preserve gameplay behavior while splitting authoritative models/combat and display scene/HUD/camera/rendering concerns into maintainable cartridge-owned modules.

## [0.11.3] - 2026-08-31

### Added

- Added SHA-verified immutable static game assets to the game manifest/runtime contract so cartridges can publish sprite sheets, atlases, track art, props and future media without embedding them in JavaScript.
- Turbo Circuit `0.4.0` introduces the first validated game-art runtime atlas: an 8-direction red racing car sheet derived from alpha-connected source components and rendered as a directional 2.5D billboard over the existing authoritative race simulation.

### Changed

- Racing remote controls now use responsive SVG steering, pedal and boost artwork only; the oversized decorative remote frame and raster WebP controller artwork were removed.
- Mobile play-toolbar actions use compact labels on narrow screens and the controller surface no longer depends on purple/neon status styling.


## [0.11.2] - 2026-08-31

### Changed

- Reframed the frontend around a restrained classic-arcade design system: charcoal, cream, muted red, teal, mustard, and desaturated blue replace glassy gradients, purple/neon accents, and oversized generic dashboard styling.
- Added production-optimized retro arcade bitmap assets for the ops console and remote controls, plus responsive SVG controller frames that switch between portrait and landscape without raster stretching.
- `/ops` now uses bounded panel frames with independent application-owned scroll areas for the published-game catalog and release-isolation model, while retaining a compact responsive outer viewport.
- Turbo Circuit remote controls now render the generated joystick base, joystick knob, and GAS pedal as independent assets inside the declarative racing controller layout.

### Fixed

- Added browser regression coverage for `/ops` panel scrolling, asset loading, and 390px mobile horizontal-overflow safety.
- Removed remaining hard-coded purple controller/pre-game accents in favor of shared design tokens.

## [0.11.1] - 2026-08-31

### Fixed

- Reworked phone remotes into bounded, safe-area-aware controller layouts for both portrait and landscape, including compact racing pedals/actions and no clipped `BOOST` control or forced rotate overlay.
- Pre-game hosts now always receive a scannable room QR (compact on phone, full-size on display) before `Start Game`, with a visible room-code fallback if QR generation fails.
- Turbo Circuit `0.3.0` improves steering deadzone/smoothing, high-speed steering authority, off-track and collision recovery, camera look-ahead, and adds a more readable circuit environment with curbs, start grid, stands, trees, billboards, minimap, and wrong-way feedback.
- Added distributed Vercel room coordination so display and controller WebSockets that land on different Function instances still share one global controller presence, validated input stream, and authority snapshot stream.
- Added deterministic room-replica authority election: shared displays/handheld replicas are preferred over remote-only replicas, and only the elected replica publishes gameplay snapshots.
- Managed Vercel realtime now fails fast without `REDIS_URL`; CI also verifies `coordination: distributed` before production browser tests, preventing local-only room state from being silently deployed.

### Infrastructure

- Added a Redis pub/sub + presence lease adapter with 45-second stale-connection expiry, bounded 256 KiB room events, and explicit coordinator failure containment.
- Added cross-instance coordinator tests and a two-replica RoomSession regression proving a controller input received by replica B updates the authoritative display snapshot on replica A.

## [0.11.0] - 2026-08-31

### Added

- A real **scan-to-join** Remote lobby: TV/laptop displays render an on-device QR code for the exact room, public rooms auto-join after scanning, password rooms keep their password gate, and scanned phones continue directly into the Remote controller flow.
- Authoritative room lifecycle state (`lobby` → `playing`) with host-only **Start Game** and **Menu** transitions. Realtime tickets are refused while a room is still in the lobby, so games do not run behind the menu.
- Pre-game setup UI for every play surface with game, mode, player count, version, QR/invite state, and host-controlled Start.
- Direction regressions for Turbo Circuit, Sky Strike, and Flight Trainer that verify left input actually turns to local vehicle/aircraft left.

### Changed

- Remote controller shells are bounded to handset-safe dimensions instead of stretching edge-to-edge on landscape phones; racing/flight layouts no longer depend on desktop minimum column widths.
- Built-in face controls read the optional manifest `displayLabel` (for example **BOOST**, **CANNON**, **MISSILE**, **FLAPS**, or **GEAR**) while `face` remains the physical A/B/X/Y placement. No game-name/action mapping is hardcoded in the renderer.
- Live display status now reports connected controllers; “scan” is reserved for the QR join action.

### Fixed

- Corrected reversed steering/yaw conventions in Turbo Circuit, Sky Strike, and Flight Trainer, including AI steering compensation where required.
- Replaced 20 Hz transform snapping in the three 3D displays with frame-time pose interpolation, angle-aware rotation smoothing, and damped camera targets to remove visible vehicle/aircraft camera jitter.
- Preserved immutable `0.2.2` intermediate releases and published final `0.2.3` releases for Turbo Circuit, Sky Strike, and Flight Trainer after moving semantic controller labels into cartridge SSOT; all earlier releases remain unchanged.

## [0.10.0] - 2026-08-31

### Added

- One adaptive **Remote** launch flow: phone-sized devices become controllers, desktop/TV-sized devices become display hubs, with explicit role switching available only as a fallback.
- Authoritative realtime presence now carries controller mode, allowing the display hub to discover unique connected remote players without browser LAN/device APIs or polling room membership.
- Host-side `presentation.remoteDisplay` policy with `shared` and `per-player` strategies plus a four-viewport cap; Turbo Circuit, Sky Strike, and Flight Trainer opt into per-player camera views while communal games remain shared.
- Multi-viewport display composition inside one sandboxed game frame: one verified display-module import and one realtime connection fan snapshots out to 1–4 player-focused views.
- Unit and browser coverage for device-role inference, remote deduplication, shared-vs-split policy, and live 1 → 2 → 1 viewport transitions as remotes join and leave.

### Changed

- Removed popup-based shared-display launch. Both TV/laptop and phone select the same `Remote` action; the display automatically scans connected remotes and chooses shared or split presentation.
- Game CRUD/MCP tools expose remote display policy as host metadata. Presentation-only changes do not require a cartridge version bump; any cartridge byte change remains immutable and requires a greater semantic version.
- Game publication explicitly strips host-only presentation metadata before hashing the cartridge manifest, preserving every existing immutable release digest.

## [0.9.0] - 2026-08-31

### Added

- Native-feeling mobile PWA navigation with a safe-area-aware five-item dock, full-width snap cards, horizontal game/template/launch rails, and standalone manifest shortcuts.
- Skeleton loading states, route-level lazy loading, async image decoding, and content-visibility hints for offscreen cards.
- Version-stamped service-worker update flow with an in-app reload toast that clears only Play Together caches/version cookies while preserving authentication sessions.
- Frontend `/developers` submission kit with repository-backed docs, MCP/tool reference, and one-click copy of the canonical full game prompt through validation and CI publish.
- Project-owned stdio MCP server and MSO fixed-argv functions for game list/get/create/update/delete/validate/local-publish/registry/prompt operations.
- Game tool regression coverage for immutable update/delete guards, MCP protocol parity, and generated PWA/docs artifacts.

### Changed

- Mobile lobby uses full-viewport horizontal snap panels instead of vertically compressing Create and Room containers.
- Mobile Templates, room launch modes, and submission rules use touch-first horizontal card rails with native scrollbars hidden.
- Game CRUD tooling keeps production deployment credentials out of the tool process and leaves production registration to verified main-branch CI.

### Security

- Published game versions cannot be modified by `game_update` without an explicit greater semantic version, and any game with release history is protected from `game_delete`.
- PWA cache refresh never clears Convex authentication storage or unrelated site cookies.

## [0.8.0] - 2026-08-30

### Added

- Full room directory CRUD for hosts: list owned rooms, edit room name/visibility/capacity/password policy, and delete rooms without changing their pinned game version.
- Application-owned scroll areas with hidden native scrollbars and custom scroll indicators for lobby and room containers.
- `docs/submitting-games.md` with the complete game submission contract and a reusable base prompt for AI coding agents.

### Fixed

- Game surfaces now occupy the full viewport while the play toolbar overlays the game instead of consuming layout height.
- Stabilized mobile viewport sizing to avoid dynamic browser-chrome height feedback during play.
- Canvas and Three.js cartridges resize their drawing buffers only when dimensions change instead of every animation frame, eliminating a major source of visible shake/flicker and unnecessary GPU work.


## [0.7.0] - 2026-08-30

### Added

- Manifest-native dynamic console topology for every active game: analog sticks, D-pads, A/B/X/Y face buttons, shoulders/triggers, racing/flight layouts, and touch surfaces are declared inside each game slice.
- Generated `game-registry.json` as the portal discovery SSOT, derived from `games/*/game.config.json`.
- Built-in mobile controller renderer shared by remote and handheld modes, with no game-name heuristics.
- Architecture guards requiring package/config version parity, unique control IDs, and exactly one controller source of truth.

### Changed

- Removed all 15 duplicated `src/controller.ts` implementations; standard controllers are generated from immutable manifest metadata.
- `entries.controller` is now optional for backward-compatible custom/legacy releases.
- Published a new immutable version for all 15 active cartridges so rooms pin the exact new controller topology.


## [0.6.0] - 2026-08-30

### Added

- Managed-first Vercel + Convex Cloud production topology with same-origin WebSocket Functions and immutable game CDN output.
- Convex Auth password-reset flow with enumeration-safe requests, rate limiting, 8-digit expiring codes, session invalidation, and dynamic Resend project metadata from `official@rahmanef.com`.
- Provider-agnostic commercial template marketplace with private source packaging, purchase entitlements, signed fulfillment webhook, and short-lived Vercel Private Blob downloads.
- Managed CI/CD job that deploys Convex Cloud and an exact Vercel production artifact only after repository verification and integration tests pass, then runs production browser E2E.
- Regression coverage for managed runtime configuration, email payloads/password policy, signed template tickets, and private template package safety.

### Changed

- Migrated the production control-plane dataset to Convex Cloud while preserving existing password-account hashes and invalidating legacy session tokens at the managed boundary.
- Realtime deployment now supports Vercel Function routing, 300-second lifecycle/reconnect behavior, `sin1` function placement, deployment-origin allowlisting, and managed health metadata.
- Browser build endpoint variables now participate in Turborepo cache hashes to prevent stale self-hosted/Cloud bundles from sharing build cache entries.
- Managed production is the primary documented deployment model; Docker/Dokploy remains a local development and temporary rollback path only.

### Security

- Paid template source is kept outside public Git, rejects secret/build/cache artifacts and symlinks during packaging, and can only be fetched through entitlement-scoped signed URLs.
- Password reset UI disables delivery when the server has no actual Resend credential instead of reporting a false success.


## [0.5.0] - 2026-08-30

### Changed

- Replaced the generic controller frame with a dark mobile-first console shell inspired by dedicated handheld hardware, without product-specific branding.
- Added dynamic `classic`, `racing`, and `flight` screenless landscape remote presets; cartridges may opt in explicitly and existing releases fall back to manifest-content inference.
- Handheld mode now uses the same modular shell system with safe-area, portrait and landscape layouts.
- Added slow-client snapshot backpressure, worker startup timeout protection, and repeated tick-failure containment in the realtime runtime.
- Added a sustained latest-cartridge stability audit covering every active game server.

## [0.4.0] - 2026-08-29

### Added

- **Turbo Circuit**, a Three.js/WebGL 3D arcade racer with server-authoritative steering, throttle, braking, nitro, off-track friction, vehicle collision, sequential checkpoints, three-lap races, and AI rivals.
- **Sky Strike**, a Three.js/WebGL fighter dogfight with bank/pitch/yaw flight, throttle, cannon projectiles, homing missiles, target lock, health, kills, respawns, round wins, and AI bandits.
- **Flight Trainer**, a Three.js/WebGL training simulator with yoke, yaw, throttle, flaps, landing gear, airspeed/altitude/VSI/heading instruments, takeoff route rings, simplified lift/stall physics, crash detection, and safe-landing conditions.
- Dedicated server tests and browser gameplay coverage for the three advanced 3D cartridges.
- Immutable `0.1.1` release candidates for the three 3D games after final lint cleanup; the initially generated `0.1.0` bytes remain preserved as history.

### Changed

- Active game catalog grows from 12 to 15 independent vertical slices while preserving all prior immutable releases.
- Platform package version advances to `0.4.0`; existing game versions remain untouched.

## [0.3.0] - 2026-08-29

### Added

- A true handheld runtime that mounts each pinned game release's live display and controller together over one authoritative realtime connection.
- Game Boy-style portrait and PSP-style landscape console composition for every handheld-capable cartridge.
- Real gameplay preview thumbnails for all 12 active games, captured from the running handheld integration stack and shown in the lobby game picker.
- A reproducible `scripts/capture-game-previews.mjs` workflow for refreshing preview media from real gameplay.

### Changed

- Unified the old separate Shared Display and Remote Only launch choices into one **Shared screen + remote** flow.
- Published new immutable cartridge versions for the playable-runtime rollout: Pong `0.3.0`, Tap Race `0.3.0`, and `0.2.0` for the other ten active games.
- Pong and Tap Race controllers now render controls only; handheld display composition is owned centrally by the browser runtime instead of duplicated per game.

## [0.2.0] - 2026-08-29

### Added

- Ten additional independent multiplayer cartridges: Reaction Rush, Memory Lights, Snake Arena, Dodge Dash, Target Blast, Tug War, Rhythm Pulse, Maze Run, Stack Tower, and Orbit Dodge.
- Browser matrix coverage that loads both the shared-display and handheld controller bundle for every new game while keeping the production room-creation rate limit enabled.

## [0.1.0] - 2026-08-29

### Added

- Convex-backed authentication, game catalog, rooms, memberships, public available-slot discovery, optional room passwords, and transactional capacity.
- Authoritative WebSocket realtime gateway with signed tickets, replay protection, validated/rate-limited input, snapshots, and one game worker per room/version.
- Immutable SHA-256-pinned game release archive and CDN.
- Sandboxed browser runtime with handheld, remote-only, and shared-display modes.
- Independent Pong and Tap Race reference games.
- Emulator adapter boundary for future lawful PS1/PS2/custom WASM integrations.
- Full unit, architecture, security, smoke, and browser E2E verification pipeline.
- Production reference topology at `game.rahmanef.com` with real gameplay screenshots and an animated desktop/mobile controller demo.
- Open-source community files, issue forms, pull-request template, and MIT license.
- Reproducible clean Convex bootstrap and configurable external production network support for Dokploy.
- Production-configurable E2E realtime health endpoint.
