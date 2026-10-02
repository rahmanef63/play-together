# Platform quality update 0.25.1

## Observed baseline

On 2026-10-02, the canonical source was `acb0960b502decd313d850745fbb7fe1048cb219`
on `main`; production at `https://game.rahmanef.com` reported version `0.25.0` with
both `revision` and `readyRevision` set to `766932108d61e10f133fc0eba2dea99570627d68`.
The spelling `game.rahmaenef.com` did not resolve. The production Compose owner was
`/home/rahman/services/play-together-production`, separate from development worktrees.

The [main CI run](https://github.com/rahmanef63/play-together/actions/runs/34402575956)
passed verification but failed integration: 29 browser scenarios passed and Turbo Circuit
failed because the scenario still expected 10 controls after the cartridge had deliberately
returned to six Tier 0 controls. The deployment watcher correctly retained the previous
verified production revision. Its gates have not been relaxed.

## Changes and acceptance

- Library search, party-size filtering, favorites, selection and room setup share one catalog
  state. An empty result cannot leave a hidden previous game ready to create a room.
- Account-menu keyboard behavior supports first-action focus, Escape return and closing when
  focus leaves. Authentication mode selection uses native form semantics and busy guards;
  mobile inputs and actions retain readable text and 44px interaction targets.
- Existing console visuals are retained: design variance 5, motion intensity 3, visual density 7.
- PWA navigation, static requests and runtime assets keep a successful network response when
  browser cache storage rejects reads or writes. Four new regressions failed on the previous
  worker; the corrected worker passed all six runtime cases plus three asset-contract cases,
  including cached assets and offline navigation while the network is unavailable.
- A crashed game worker immediately evicts its closed room session, so reconnect can start a
  fresh worker. Connections closed during startup or distributed registration cannot remain
  registered as players; failed empty starts are reclaimed by the existing idle timeout.
- Runtime error recovery tracks frame and connection failures independently. A valid snapshot
  clears only the connection error; a frame-ready message clears only the renderer error.
  Reconnect status alone does not hide either failure, and recovery of one producer preserves
  any outstanding error from the other.
- Room directories use their existing indexes in descending order before the 100-room bound,
  so newly created rooms remain discoverable after a busy account reaches that bound. The
  record limit remains 100; no schema or public API changed.
- Consumed Enter on native and ARIA buttons no longer triggers gameplay shortcuts; toggling
  Turbo's minimap cannot also dispatch START/pause. Shared keyboard aliases still work.
- Turbo's browser scenario asserts its six actual controls and the absence of removed
  shoulders, while retaining gameplay, compact-screen, cruise, recovery and pause assertions.
- Production web/realtime containers now inherit the existing local stack's read-only root,
  dropped capabilities, no-new-privileges and bounded temporary-storage policy. Realtime's
  verified module cache remains writable in `/tmp`; the ready-revision mount remains read-only.
- The private-template dependency uses a narrowly scoped `@vercel/blob>undici` override to
  `6.28.1`, fixing the upstream [WebSocket denial-of-service advisory](https://github.com/nodejs/undici/security/advisories/GHSA-rfgv-xxqx-mfg5).
  The updated lockfile passed `pnpm audit --audit-level low` with no known vulnerabilities.

## Verification record

Completed during implementation:

- Production `/api/health` and `/api/realtime` baseline checks: healthy, distributed coordination,
  release control ready; production was not changed during the audit.
- VPS configuration regression: six tests passed, including each service's hardening contract.
- Production Compose configuration validation with the committed example environment: passed.
- An isolated container using the previous known web image and the new security flags served
  health successfully, rejected writes under `/app`, reported zero effective capabilities and
  `NoNewPrivs: 1`, and imported a JavaScript module from the bounded `noexec` tmpfs. This checks
  runtime compatibility of the hardening; it does not claim the new revision was deployed.
- Turbo scenario formatting and static checks: passed.
- Room directory and admission regressions: six passed; the new 105-record case failed on the
  previous ascending query and passed after the ordering fix. Convex typecheck passed.
- Realtime suite: 28 passed, with two Redis integration tests skipped because this local unit
  run did not configure a Redis test endpoint. Realtime typecheck and architecture passed;
  six new manager cases include blocked-release denial and worker failure/reconnect behavior.
- Library preference regressions: three passed; web typecheck, architecture and scoped lint
  checks passed before browser verification.
- PWA runtime and asset-contract verification repeated after resume: nine tests passed.

This record proves the local release candidate. Production delivery is established separately
by exact-SHA CI, public health, and browser acceptance; do not infer it from local success.

Resume inspection at 22:12 UTC on 2026-10-02 confirmed:

- `.local/verify-20261002.log` completed all `pnpm verify` gates successfully, including source
  security scanning and dependency audit. The realtime unit run still reports the two
  deliberately unconfigured Redis integration cases as skipped.
- The isolated web/realtime images were created at 17:05 UTC after the current runtime edits.
  Read-only comparison of their source maps matched all 117 web and 25 realtime application
  source files against the task worktree, including every edited runtime TypeScript file.
  Served CSS and `sw.js` also matched the verified host build. Local Docker reports the build
  revision as `unknown`; this local metadata is not evidence of an exact production SHA.
- The production owner checkout remained clean at `766932108d61e10f133fc0eba2dea99570627d68`.
  Public health reported that same running/ready SHA and version `0.25.0`; realtime reported
  distributed coordination and ready release control.
- `play-together-vps-deploy.timer` was active, with its existing three-minute poll interval;
  the latest oneshot run exited successfully while retaining production because the exact
  `acb0960` main CI run had a failed integration job and skipped prepare-production job.
  Its gates, checkout, credentials and deployment state were not changed by this inspection.

Final local verification after the recovery and keyboard edits:

- `pnpm verify` completed successfully; `.local/verify-keyboard-final-20261002.log` records lint,
  architecture, asset, type, build, realtime-smoke and security gates, plus 412 passing unit
  tests and two skipped Redis integration tests without a configured Redis test endpoint.
- `pnpm test:embed` passed all eight nested-origin scenarios, including denied ancestors;
  evidence is `.local/embed-20261002.log`.
- Both focused library browser scenarios passed, covering synchronized filters/room setup and
  keyboard account-menu behavior.
- `pnpm test:gameplay-controls` passed all 119 browser cases across six published cartridges,
  compact portrait/landscape viewports and authoritative controls; no runtime errors were
  reported. Evidence is `.local/gameplay-controls-20261002.log`.
- The earlier combined Turbo and six-cartridge scenarios exhausted their unchanged 90-second
  total budgets on this busy host. The Turbo trace contained the expected COIN text, and
  also exposed the real consumed-Enter pause defect now fixed at the shared keyboard owner.
  Garage and racing checks, catalog assertions and each cartridge menu now run independently,
  retaining every assertion and timeout. Preserve `.local/e2e-final-20261002.log` as the original
  evidence. The final run passed all 39 scenarios without retries in 6.4 minutes; evidence is
  `.local/e2e-keyboard-final-20261002.log`. Registration, admission, QR pairing, controller input,
  network/WebGL recovery, account keyboard behavior and synchronized library setup all passed.

## Isolated host runbook

The task stack uses Compose project `play-together-quality-20261002` in
`/home/rahman/worktrees/play-together-quality-20261002`. Its generated secrets and state remain
in ignored, owner-only `.env` and `.local` files. It does not reuse production credentials or
another worktree's Convex database.

| Surface | Local port |
| --- | --- |
| Web | 55173 |
| Realtime | 59787 |
| Game CDN | 59081 |
| Convex API | 55310 |
| Convex site host binding | 55311 |
| Convex dashboard | 57791 |

The host's default Docker address pools were exhausted. After inspecting existing Docker
subnets and host routes, only the task network was created on unused `10.240.203.0/24`, with
Compose project/network ownership labels. No existing networks were removed or reconfigured.
The internal Convex issuer stays on `convex-site.localhost:43211` to match the existing
network-namespace loopback bridge, independently of its external host binding.

```bash
E2E_BASE_URL=http://localhost:55173 \
E2E_REALTIME_HEALTH_URL=http://localhost:59787/healthz \
pnpm test:e2e
```

Bootstrap output is `.local/bootstrap-20261002.log`. After browser/runtime edits finish,
rebuild the task web/realtime images before using this stack as final evidence. Shut down only
this Compose project when finished; preserve its volume unless local data deletion is intended.

After the runtime error-recovery edit, only the task web image was rebuilt and its container
recreated with `--no-deps --wait`; output is `.local/web-rebuild-final.log`. After the shared
keyboard fix and final verification, the web-only build/recreate was repeated;
`.local/web-rebuild-keyboard-final.log` records the final image. This container was healthy and
its source maps matched all 117 current web application files, explicitly including
`mountGameRuntime.ts` and `frame/controller/keyboard.ts`. Convex, realtime, CDN and loopback
container IDs and start times were unchanged. Browser integration must use this keyboard-final
image rather than an earlier image.

## Release and rollback

Publish through the exact-main-SHA verify/integration/prepare-production gates. Confirm
`/api/health.revision` and `readyRevision` match the released SHA, then verify realtime readiness,
new-room creation, input, reconnect and the updated browser flows against production.

Rollback deploys the previously green `766932108d61e10f133fc0eba2dea99570627d68` checkout;
Convex changes must remain backward-compatible. Published game bytes and live room pins are
unchanged by this platform update. Do not reset durable Convex state or weaken release gates.

Release-candidate status: all required local gates, 119 controller cases, eight embed cases
and all 39 multiplayer browser scenarios passed. Production delivery proceeds through the
existing exact-SHA CI and deployment watcher; this source record does not preclaim live delivery.
