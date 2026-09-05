# Sign in on another screen

## Player flow

On the screen that needs an account, select **QR sign-in → Show sign-in QR**. On a phone or browser already signed in to Play Together, scan the QR. Alternatively, open `/device` and enter the displayed eight-character code. Select **Review device**, compare the code against the requesting screen, confirm that it is your screen, and select **Approve sign-in**. Decline rejects the request without signing in the other device.

A Google-authenticated phone can approve a requesting TV or embedded Play Together screen. This creates a new Play Together session on the requesting screen through the existing authentication provider. It does not copy the Google session, bypass Google's consent screen, transfer cookies through ChatGPT, or share a session token in the QR.

Never approve a code sent to you by another person. The device label is a friendly name supplied by the requester, not proof of physical device ownership. Check the code on a screen you control. Approval grants access to your Play Together account on that screen; sign out there when finished, particularly on shared TVs.

## Security contract

The public QR contains only the application's `/device?pair=...` route and a random public approval code. It never contains a session token, JWT, requester proof, or OAuth callback code. The `pair` field is deliberately distinct from OAuth's `code` query parameter.

The requesting browser generates a 256-bit private proof using Web Crypto, retains it in memory, and sends only its SHA-256 digest when creating a request. The server stores the code digest and proof digest. Approval requires an authenticated user and an explicit mutation; merely scanning, loading or reviewing a QR does not grant access. The original browser must present the private proof to consume an approved request. Consumption is a single transactional mutation; replay and simultaneous second claims are rejected.

Requests expire after five minutes. The client polls serially at four-second intervals; the server signals `slow_down` for excessive polling. Start requests are bounded by a six-per-minute client limit and a 120-per-minute global ceiling; inspect/approve operations have authenticated per-user limits. Client IDs are not trusted identities, so the global ceiling remains necessary. Unmounting or replacing the requesting QR cancels its pending request on a best-effort basis. Expiry remains authoritative when a device disappears. A cron deletes expired requests in bounded batches.

This is a first-party device approval flow using the existing Convex credentials/session machinery. It is not advertised as a general RFC 8628 OAuth server. Authentication/session expiration and sign-out behavior remain owned by Convex Auth. The first version does not add a separate device inventory or remote session-revocation dashboard.

## Verification

`tests/device-login.test.ts` exercises the real action/mutation implementations using `convex-test`: unauthenticated approval, inspection without approval, wrong proof, pending claims, single-use consumption, concurrent claims, second-owner overwrite, expiry, decline/cancel, polling and allocation limits, and cleanup.

`e2e/device-sign-in.spec.ts` uses independent browser contexts for the requesting screen and an authenticated approving phone. Run it against the local production topology before promotion, then verify the public deployment. The mock suite alone does not certify production behavior.

## Toast and troubleshooting UX

Expected account errors use concise safe messages. The notification has an explicit recovery action and dismiss button; diagnostic request IDs are collapsed under **Details** with a copy action. Inline field errors remain after a toast disappears. Arbitrary backend exception text, personal data and authentication URLs are not rendered. Toast announcements use accessible alert/status semantics, deduplicate repeated titles, and pause expiry while a user is interacting with the notice.

## References

- OAuth device-flow security considerations: https://www.rfc-editor.org/rfc/rfc8628
- Convex mutation atomicity: https://docs.convex.dev/functions/mutation-functions
- Convex testing limitations: https://docs.convex.dev/testing/convex-test
