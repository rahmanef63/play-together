# Public production follow-up — 2026-09-05

The source-only delivery boundary recorded below is historical. Gameplay and embed fixes were
pushed to remote `main` and deployed to `https://game.rahmanef.com` during the follow-up session.
Runtime commit: `358e391`. Public platform: **0.14.2**. Registered current cartridges:
**Turbo Circuit 0.10.1**, **Flight Trainer 0.3.0**, **Sky Strike 0.3.0**.

Verified against the public domain: all three game control/render scenarios including sound
mute/unmute, the current three-cartridge picker, WebGL context-loss recovery, and controller/shared
display reconnect with input after interrupted heartbeats. The combined recovery run hit its
90-second test budget once; the unchanged reconnect assertions passed in an isolated 58.8-second
run with a 150-second overall runner budget and tracing disabled. Do not describe the initial
combined run as entirely green.

Production realtime reported `ok: true`, distributed coordination and ready release control.
The published manifest bytes matched local SHA-256 identities. New-room catalogue publication
was performed explicitly in Convex; existing room pins and historical bytes were preserved.

The current `pnpm verify` pipeline passed. The remaining GitHub integration failure was traced
to an old picker-label expectation (0.2.6 / 0.9.2), not a failed game load. That assertion now
reads current source manifest versions and its public browser scenario passed; the next GitHub
run must independently establish CI status. Node 22 JSON import attributes were corrected too.

Preview investigation reproduced the missing ancestor allowlist through ChatGPT → sandbox → MSO.
Only `/embed` and its inner cartridge frame now allow the reviewed exact origins. Normal app
framing remains restricted. The new MSO Page lifecycle/readiness code was checked with a synthetic
MCP host and the actual public game at desktop and mobile widths. MSO runtime deployment is a
separate release from this game; check its current toolset before claiming the server updated.

Follow-up VPS logs: `/tmp/pt-verify-audio-62a831.log`, `/tmp/pt-public-e2e-audio-62a831.log`,
`/tmp/pt-public-reconnect-isolated-62a831.log`, `/tmp/pt-public-catalog-62a831.log`.

---

# Gameplay validation — 2026-09-05

## Delivery boundary

Source branch: `feat/gameplay-controller-20260905`, based on `9d29290`.

Worktree: `/home/rahman/projects/play-together-gameplay-20260905`.

MSO Fresh 3 workflow: `e8ee96a1-5136-452e-bf42-404f9d7f5309`.

Source platform version: **0.14.0**. New immutable cartridge identities: **Turbo Circuit 0.10.0**, **Flight Trainer 0.3.0**, **Sky Strike 0.3.0**. Existing immutable releases were not rewritten.

Production was checked after verification and still reports **0.13.3** at `https://game.rahmanef.com/version.json`. This work is not merged, pushed or deployed. Do not interpret a source version, generated cartridge, screenshot or passing unit test as production availability.

## Verified results

| Check | Result | Scope |
| --- | --- | --- |
| `pnpm verify` | Passed, final exit 0 | Preparation, lint, architecture, all workspace/Convex TypeScript checks, unit/integration tests, production build, realtime smoke, source security scan and dependency audit |
| Workspace and root test suites | 181 passed; 2 Redis scenarios skipped in this default invocation | Contracts 10, security 3, realtime 18, browser runtime 10, Flight Trainer 8, Sky Strike 9, Turbo Circuit 23, web 43, root integration 57 |
| Realtime suite against isolated Redis 7 | 20 passed, none skipped | Includes both Redis scenarios skipped by the default invocation; 183 unique unit/integration scenarios were therefore exercised across the two runs |
| `pnpm test:gameplay-controls` | 31 browser cases passed; no uncaught runtime errors | 24 controller layouts, one keyboard/shoulder/focus lifecycle case, six actual 3D display cases fed authoritative game snapshots |
| Release integrity tests | Passed | Executable SHA-256 pins, discovered-game catalogue and immutable release checks |
| Realtime smoke | Passed | Authoritative input/state flow, ticket expiry and live release blocking |
| Dependency audit | No known vulnerabilities reported at execution | Not a guarantee against undiscovered vulnerabilities |
| `git diff --check` | Passed | No whitespace errors |

Controller layouts cover **320×568, 360×800, 844×390 and 1280×720**, both remote and handheld. They check target dimensions, viewport clipping, obscured centers and overlapping control rectangles. The extra 3D checks mount each game and its controls at 360×800 and 844×390 with snapshots from a four-player server simulation. These are isolated rendering/integration checks, not four real clients joining an authenticated room.

The Redis test container was stopped and removed. The attempted local Compose project left no containers, networks or volumes. Temporary local authentication material and patch scripts created by this task were removed. Test screenshots/logs remain ignored and are not game assets.

## Blocked verification and release condition

`pnpm stack:bootstrap` failed while pulling the repository-pinned Convex images from GHCR. The registry returned `denied`, followed by an unavailable pinned dashboard image. The failing dashboard identity is:

```text
ghcr.io/get-convex/convex-dashboard@sha256:284a2638e0c1a4ec0c2327d8219776f3a426ca5824b81686ae4d9454dc0ce8ed
```

The full authenticated room-join/start/reconnect E2E suite could not run against that stack. No production promotion was attempted. This report does not infer whether the registry denial is caused by account authorization, image availability or the recorded digest. Do not bypass the pin with an arbitrary image merely to turn the test green. Restore an authorized, verified local Convex image path and run the room E2E suite before merging/promoting this change.

Physical Xbox/PlayStation pads, mobile Bluetooth compatibility, prolonged multiplayer sessions and mobile thermal/frame-pacing behavior still need real-device playtesting. Standard browser gamepad mapping and digital trigger behavior are covered by synthetic adapter tests, not hardware certification.

## Reproducible evidence on the VPS

- Final full gate log: `/tmp/play-together-verify-final-20260905.log`.
- Controller and 3D browser log: `/tmp/play-together-gameplay-browser-20260905.log`.
- Redis integration log: `/tmp/play-together-redis-tests-20260905.log`.
- Blocked local-stack log: `/tmp/play-together-stack-20260905.log`.
- Browser result JSON and screenshots: `.local/gameplay-controls-qa/`.
- Current mappings and proposed games: `docs/gameplay-development.md`.

Ridge Rush, Clash Arena and Sky Rescue are proposals only. No placeholder cartridge was published for those concepts.

## Follow-up: manual embed failure at 12:19 UTC

The owner reported that `game.rahmanef.com` still refused framing in ChatGPT. Live inspection
confirmed platform 0.14.2 was deployed, contrary to the prior conversational summary. Earlier
browser fixtures used the literal MSO origin and therefore did not prove app-scoped sandbox
support. Reproduction against the real 0.14.2 app found two independent defects: an app-scoped
sandbox ancestor was blocked by CSP, and adding that ancestor in the browser fixture still left
the readiness message undelivered because its target origin was hard-coded.

The 0.14.3 source fix accepts only the HTTPS `*.web-sandbox.oaiusercontent.com` family in the
existing `/embed` namespace and sends a constant public readiness marker to the immediate parent.
The receiving MSO Page still verifies the exact game origin and source window. No credentials,
player state, iframe security bypass, remote browser or arbitrary-URL proxy was introduced.

Verification before promotion: 194 default unit/integration passes with two optional Redis
scenarios skipped, full `pnpm verify` exit 0, 31 controller/render browser cases, eight nested
origin scenarios (including denied suffix-lookalikes and unreviewed ancestors). The readiness
regression failed three cases before the fix and passed all eight afterward. Synthetic sandbox
hostnames are fixture inputs, not a claim that the owner's actual browser origin was captured.
This record describes source verification; production promotion needs its own live checks.

## Console, QR and television pass — 0.15.1

Public main `9e93ff3` delivered the console home, short actionable toasts, proof-bound QR
sign-in and old-browser diagnostic paths. The initial 0.15.0 public QR deep link returned 404;
0.15.1 adds `/device` to the explicit Vercel SPA rewrite table and tests every fixed App route.
The final public UI/auth suite passed 11 scenarios, including independent requester/approver
sessions, decline, mobile panel bounds, keyboard tabs and no-script TV help. Room CRUD also
passed. Current cartridge releases and hashes were not rewritten.

A subsequent production game test failed its speed assertion after a 1450 ms completed click.
The browser trace showed the kart at 29 km/h immediately after the gas click, then 25, 18, 13,
10, 6, 4 and 0 after release. The test was measuring coast-down, not held acceleration. It now
keeps the real pointer down during the unchanged >20km/h assertion, releases in `finally`,
and verifies the button returns to unpressed. No game physics or input source changed for
this test correction. All claims about real TV compatibility remain unverified until the
owner's actual model/firmware is tested; capability mocks are not hardware certification.

Final held-input production check passed (43.8 seconds). The original 0.15.1 pipeline for
`9e93ff3` completed verify, integration and deploy-managed successfully. The test correction
changes only documentation and E2E code; deployed application bytes remain unchanged.

## Phone scanner and launcher follow-up — 0.16.0

Application source `01d8c01` was pushed to main and deployed to the public site. Before the fix,
fresh plain/ASCII-hyphen/lowercase codes worked in the controlled production reproduction,
but smart-dash and surrounding-space variants failed; the input truncated to nine characters.
There was no in-app camera scanner. The exact cause of every original user attempt is unknown.

The shared frontend/backend code grammar now normalizes phone input. Live camera and photo QR
decoding run locally; only a valid first-party approval code is reviewed. Confirmation is a
separate focused step and never automatic. The camera fixture uses a generated QR video stream,
not the owner's physical phone. Actual camera permissions in the owner's browser remain a
real-device check. Camera-ineligible embedded hosts retain photo/manual/browser-tab alternatives.

The final source gates passed 279 unit/integration tests (two optional Redis cases skipped),
31 controller/render cases and eight embed boundary scenarios. Fourteen affected built-browser
cases passed locally using the real auth backend. On production, 16 affected cases and seven
additional multiplayer/ops/recovery cases passed. One remaining room-admission test referenced
the deliberately removed `.console-registry-card`; it now verifies the real manifest-derived
`.library-controls` text instead. That complete production scenario then passed in 33.5 seconds.
Thus all 24 browser scenarios were exercised successfully across the final public runs, not
claimed as a single uninterrupted run. Game release bytes were unchanged.

The first 0.16.0 GitHub run passed source verification but failed integration. Its detailed logs
were unavailable through the current GitHub CLI/public log access. The obsolete room-admission
selector was independently reproduced and corrected; a new CI run must confirm its own result.
The follow-up commit only changes the test and this report, not deployed application bytes.
