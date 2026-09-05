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
